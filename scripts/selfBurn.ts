import { Address, toNano } from '@ton/core';
import { sign } from '@ton/crypto';
import { ProxySmartcontract } from '../wrappers/ProxySmartcontract';
import { NetworkProvider, sleep } from '@ton/blueprint';
import { Opcodes } from '../helpers/Opcodes';
import { createKeys } from '../helpers/keys';

async function sendToOwner(provider: NetworkProvider, args: string[]) {
    const ui = provider.ui();

    const address = Address.parse(args.length > 0 ? args[0]: await ui.input('Smc address'));

    const proxySmartcontract = provider.open(ProxySmartcontract.createFromAddress(address));

    const seqno = await proxySmartcontract.getSeqno();
    const kp = await createKeys();

    await proxySmartcontract.sendExternalMessage({
        opCode: Opcodes.selfdestruct,
        seqno: seqno,
        signFunc: (buf) => sign(buf, kp.secretKey)
    });

    ui.write('Successfully transfered');
}