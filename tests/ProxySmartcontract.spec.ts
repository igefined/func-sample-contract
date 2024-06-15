import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, toNano } from '@ton/core';
import { compile } from '@ton/blueprint';
import { KeyPair, mnemonicNew, mnemonicToPrivateKey, sign } from 'ton-crypto';
import { randomAddress } from '@ton/test-utils';
import { ProxySmartcontract } from '../wrappers/ProxySmartcontract';
import { Opcodes } from '../helpers/Opcodes';
import '@ton/test-utils';

async function generateKP() {
    let mnemonic = await mnemonicNew();
    return mnemonicToPrivateKey(mnemonic);
}

describe('ProxySmartcontract', () => {
    let code: Cell;
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let proxySmartcontract: SandboxContract<ProxySmartcontract>;
    let kp: KeyPair;
    let owner: SandboxContract<TreasuryContract>;

    beforeAll(async () => {
        code = await compile('ProxySmartcontract');
    });

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        kp = await generateKP();
        owner = await blockchain.treasury('owner');

        proxySmartcontract = blockchain.openContract(ProxySmartcontract.createFromConfig({
            seqno: 0,
            publicKey: kp.publicKey,
            ownerAddress: owner.address,
        }, code));

        deployer = await blockchain.treasury('deployer');

        const deployResult = await proxySmartcontract.sendDeploy(deployer.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: proxySmartcontract.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and proxySmartcontract are ready to use
    });

    it('should accept deposit', async () => {
        const sender = await blockchain.treasury('sender');

        const depositResult = await proxySmartcontract.sendDeposit(sender.getSender(), toNano('2.0'));
        expect(depositResult.transactions).toHaveTransaction({
            from: sender.address,
            to: proxySmartcontract.address,
            success: true,
        });

        const balance = await proxySmartcontract.getBalance();
        expect(balance).toBeGreaterThan(toNano('1.99'));
    });

    it('should not allow to withdraw funds if sender is not an owner', async () => {
        const sender = await blockchain.treasury('sender');

        const depositResult = await proxySmartcontract.sendDeposit(sender.getSender(), toNano('2.0'));
        expect(depositResult.transactions).toHaveTransaction({
            from: sender.address,
            to: proxySmartcontract.address,
            success: true,
        });

        const balance = await proxySmartcontract.getBalance();
        expect(balance).toBeGreaterThan(toNano('1.99'));
        
        const withdrawResult = await proxySmartcontract.sendWithdraw(sender.getSender(), {
            value: toNano('0.5'),
            amount: toNano('1')
        });
        expect(withdrawResult.transactions).toHaveTransaction({
            from: sender.address,
            to: proxySmartcontract.address,
            success: false,
            exitCode: 411,
        });
    });

    it('should change owner', async () => {
        const changeOwnerResult = await proxySmartcontract.sendChangeOwner(owner.getSender(), {
            value: toNano('0.1'),
            address: randomAddress(),
        });
        expect(changeOwnerResult.transactions).toHaveTransaction({
            from: owner.address,
            to: proxySmartcontract.address,
            success: true,
        });
    });

    it('should fail on wrong signature', async () => {
        const invalidKP = await generateKP();

        await expect(
            proxySmartcontract.sendExternalMessage(
                {
                    opCode: Opcodes.selfdestruct,
                    signFunc: (buf) => sign(buf, invalidKP.secretKey),
                    seqno: 0
                }
            )
        ).rejects.toThrow(); 
    });

    it('should sign', async () => {
        await  proxySmartcontract.sendExternalMessage(
                {
                    opCode: Opcodes.selfdestruct,
                    signFunc: (buf) => sign(buf, kp.secretKey),
                    seqno: 0
                }
            );
    })
});
