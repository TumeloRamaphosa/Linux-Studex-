import path from 'node:path';
import {HermesJarvisAdapters} from './providers.mjs';
export function configuration(origin,root,env=process.env){
 const demo=env.COMS_DEMO==='1',operatorSecret=env.COMS_OPERATOR_SECRET||'',legacyEnabled=env.COMS_ENABLE_LEGACY_OPERATOR==='1';
 if(legacyEnabled&&operatorSecret.length<32)throw Error('Legacy operator mode requires an explicit strong operator secret');
 return {origin,demo,operatorSecret,legacyEnabled,store:env.COMS_JOURNAL||path.join(root,'server/coms/.state/journal.json'),scope:{tenant_id:env.COMS_TENANT_ID||'synthetic-team',client_id:env.COMS_CLIENT_ID||'synthetic-client'},callbackKey:env.COMS_HERMES_CALLBACK_KEY||'',callbackSource:env.COMS_HERMES_SOURCE||'hermes-configured',adapters:new HermesJarvisAdapters({hermes:{origin:env.COMS_HERMES_ORIGIN,token:env.COMS_HERMES_TOKEN,verified:env.COMS_HERMES_CONTRACT_VERIFIED==='1'},jarvis:{origin:env.COMS_JARVIS_ORIGIN,token:env.COMS_JARVIS_TOKEN,model:env.COMS_JARVIS_MODEL,verifiedReadOnly:env.COMS_JARVIS_READ_ONLY_VERIFIED==='1'}})};
}
