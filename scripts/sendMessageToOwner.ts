import { Address, toNano } from '@ton/core';
import { ProxySmartcontract } from '../wrappers/ProxySmartcontract';
import { NetworkProvider, sleep } from '@ton/blueprint';

async function sendToOwner(provider: NetworkProvider, args: string[]) {
    const ui = provider.ui();

    const address = Address.parse(args.length > 0 ? args[0]: await ui.input('Smc address'));

    const proxySmartcontract = provider.open(ProxySmartcontract.createFromAddress(address));

    await proxySmartcontract.sendMessageToOwner(provider.sender(), toNano('0.05'));

    ui.write('Successfully transfered');
}