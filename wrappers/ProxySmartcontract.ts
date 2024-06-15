import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';
import { Opcodes } from '../helpers/Opcodes';

export type ProxySmartcontractConfig = {
    seqno: number;
    publicKey: Buffer;
    ownerAddress: Address;
};

export function proxySmartcontractConfigToCell(config: ProxySmartcontractConfig): Cell {
    return beginCell()
        .storeUint(config.seqno, 32)
        .storeBuffer(config.publicKey)
        .storeAddress(config.ownerAddress)
    .endCell();
}

export class ProxySmartcontract implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new ProxySmartcontract(address);
    }

    static createFromConfig(config: ProxySmartcontractConfig, code: Cell, workchain = 0) {
        const data = proxySmartcontractConfigToCell(config);
        const init = { code, data };
        return new ProxySmartcontract(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async sendDeposit(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                    .storeUint(Opcodes.deposit, 32)
                .endCell(),
        });
    }

    async sendWithdraw(provider: ContractProvider, via: Sender,
        opts: {
            value: bigint,
            amount: bigint,
        }
    ) {
        await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                    .storeUint(Opcodes.withdrawFunds, 32)
                    .storeCoins(opts.amount)
                .endCell(),
        });
    }

    async sendChangeOwner(provider: ContractProvider, via: Sender,
        opts: {
            value: bigint,
            address: Address
        }
    ) {
        await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                    .storeUint(Opcodes.changeOwner, 32)
                    .storeAddress(opts.address)
                .endCell(),
        });
    }

    async sendMessageToOwner(provider: ContractProvider, via: Sender, value: bigint){
        await provider.internal(via, {
            value: value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                    .storeUint(Opcodes.transferMsgToOwner, 32)
                .endCell(),
        });
    }

    async sendExternalMessage(
        provider: ContractProvider, 
        opts: {
            opCode: number,
            seqno: number,
            signFunc: (buf: Buffer) => Buffer;
        },
    ){
        const msgToSign = beginCell()
                .storeUint(opts.seqno, 32)
                .storeUint(opts.opCode, 32)
            .endCell();

        const signature = opts.signFunc(msgToSign.hash());

        await provider.external(
            beginCell()
                .storeBuffer(signature)
                .storeSlice(msgToSign.asSlice())
            .endCell()
        );
    }

    async getBalance(provider: ContractProvider): Promise<number> {
        const result = await provider.get('get_smc_balance', []);
        return result.stack.readNumber();
    }

    async getSeqno(provider: ContractProvider): Promise<number> {
        const result = await provider.get('get_seqno', []);
        return result.stack.readNumber();
    }
}
