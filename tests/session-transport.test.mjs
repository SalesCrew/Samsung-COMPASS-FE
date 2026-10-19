import test from 'node:test';
import assert from 'node:assert/strict';
import { sessionFetch, SessionUnavailable } from '../app/lib/sessionTransport.ts';
import { roleRoute } from '../app/lib/roleRoute.ts';
const token=(access_token,id='person-a')=>({access_token,user:{id}});
const denied=code=>new Response(JSON.stringify({code}),{status:401,headers:{'content-type':'application/json'}});

test('roles have one canonical destination regardless of the login URL',()=>{
 assert.equal(roleRoute('sec'),'/');
 assert.equal(roleRoute('app_admin'),'/admin');
 assert.equal(roleRoute('department_admin'),'/admin');
});
test('an authenticated request uses the current token, not an old polling closure',async()=>{
 const seen=[];
 const response=await sessionFetch('/dashboard',{},'person-a',{current:async()=>token('fresh'),refresh:async()=>assert.fail('must not refresh')},async(_url,options)=>{seen.push(new Headers(options.headers).get('Authorization'));return new Response('{}');});
 assert.equal(response.status,200);assert.deepEqual(seen,['Bearer fresh']);
});
test('expired authentication refreshes once and retries with the renewed token',async()=>{
 let current=token('old'),refreshes=0;const seen=[];
 const response=await sessionFetch('/dashboard',{},'person-a',{current:async()=>current,refresh:async()=>{refreshes++;return current=token('new');}},async(_url,options)=>{seen.push(new Headers(options.headers).get('Authorization'));return seen.length===1?denied('AUTH_REQUIRED'):new Response('{}');});
 assert.equal(response.status,200);assert.equal(refreshes,1);assert.deepEqual(seen,['Bearer old','Bearer new']);
});
test('a simultaneous automatic refresh is reused without spending another refresh token',async()=>{
 let current=token('old');const seen=[];
 await sessionFetch('/dashboard',{},'person-a',{current:async()=>current,refresh:async()=>assert.fail('already refreshed')},async(_url,options)=>{seen.push(new Headers(options.headers).get('Authorization'));current=token('renewed');return seen.length===1?denied('AUTH_REQUIRED'):new Response('{}');});
 assert.deepEqual(seen,['Bearer old','Bearer renewed']);
});
test('wrong old password is returned without retrying or changing the session',async()=>{
 let count=0;
 const response=await sessionFetch('/admin/password',{method:'POST'},'person-a',{current:async()=>token('valid'),refresh:async()=>assert.fail('password failure is not session expiry')},async()=>{count++;return denied('REQUEST_FAILED');});
 assert.equal(response.status,401);assert.equal(count,1);
});
test('logout and account switching cannot send a request as another person',async()=>{
 for(const session of [null,token('other','person-b')])await assert.rejects(sessionFetch('/dashboard',{},'person-a',{current:async()=>session,refresh:async()=>null},async()=>assert.fail('no request allowed')),SessionUnavailable);
 let current=token('old'),calls=0;
 await assert.rejects(sessionFetch('/dashboard',{},'person-a',{current:async()=>current,refresh:async()=>{current=null;return token('new');}},async()=>{calls++;return denied('AUTH_REQUIRED');}),SessionUnavailable);
 assert.equal(calls,1);
});
test('aborting during token lookup prevents a request from an unmounted view',async()=>{
 const controller=new AbortController();
 await assert.rejects(sessionFetch('/dashboard',{signal:controller.signal},'person-a',{current:async()=>{controller.abort();return token('valid');},refresh:async()=>null},async()=>assert.fail('cancelled request')), {name:'AbortError'});
});
