import test from 'node:test';import assert from 'node:assert/strict';
import {staffingSourceLabel} from '../app/lib/importStaffing.ts';
const source={division:'IM',expectedPeople:1,receivedPeople:0,status:'awaiting',asOf:null};
test('the pending opposite division is a waiting list, not another required name in the current file',()=>{
 assert.equal(staffingSourceLabel(source,'HE'),'1 Person · Liste noch ausstehend');assert.equal(staffingSourceLabel({...source,division:'HE'},'HE'),'1 Person · diese Datei');
});
test('a saved draft is distinguished from published data and inaccessible progress stays unknown',()=>{
 assert.equal(staffingSourceLabel({...source,status:'draft',receivedPeople:1}),'1 Person · Entwurf gespeichert');assert.equal(staffingSourceLabel({...source,status:'published',receivedPeople:1}),'1 Person · veröffentlicht');assert.equal(staffingSourceLabel({...source,status:'restricted'}),'Status außerhalb deines Bereichs');
});
