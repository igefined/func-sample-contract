import { Address, toNano } from '@ton/core';
import { ProxySmartcontract } from '../wrappers/ProxySmartcontract';
import { NetworkProvider, sleep } from '@ton/blueprint';

async function deposit(provider: NetworkProvider, args: string[]) {
    const ui = provider.ui();

    const address = Address.parse(args.length > 0 ? args[0]: await ui.input('Smc address'));

    const proxySmartcontract = provider.open(ProxySmartcontract.createFromAddress(address));

    const balanceBefore = await proxySmartcontract.getBalance();

    await proxySmartcontract.sendDeposit(provider.sender(), toNano('0.1'));

    let balanceAfter = await proxySmartcontract.getBalance();

    let attempt = 1;
    while(balanceAfter === balanceBefore) {
        ui.setActionPrompt(`Attempt ${attempt}`);
        await sleep(2000);
        balanceAfter = await proxySmartcontract.getBalance();
        attempt++;
    }

    ui.clearActionPrompt();
    ui.write('Balance increased successfully');
}