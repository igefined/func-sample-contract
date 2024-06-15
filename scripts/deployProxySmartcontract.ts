import { Address, toNano } from '@ton/core';
import { ProxySmartcontract } from '../wrappers/ProxySmartcontract';
import { compile, NetworkProvider } from '@ton/blueprint';
import { createKeys } from '../helpers/keys';

export async function run(provider: NetworkProvider) {
    const proxySmartcontract = provider.open(ProxySmartcontract.createFromConfig({
        seqno: 0,
        publicKey: (await createKeys()).publicKey,
        ownerAddress: Address.parse('0QAC4yxoPhMTTSLiEFgVyf7P1PcacxyvNkKeRF5t5DXhqg3s')
    }, await compile('ProxySmartcontract')));

    await proxySmartcontract.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(proxySmartcontract.address);
}
