import assert from 'node:assert/strict';import test from 'node:test';import {marketLineageText} from '../app/lib/marketLineage.ts';

test('the confirmed market label controls the historical transition while original source names remain untouched',()=>{
 const periods=[{fromMonth:'2025-07',throughMonth:'2026-01',sourceAssignmentId:'old',sourceMarket:'MM Alter Markt',marketAssignmentId:'old',market:'MM Alter Markt'},{fromMonth:'2026-02',throughMonth:'2026-02',sourceAssignmentId:'new',sourceMarket:'MM Neuer Markt',marketAssignmentId:'old',market:'MM Alter Markt'},{fromMonth:'2026-03',throughMonth:null,sourceAssignmentId:'new',sourceMarket:'MM Neuer Markt',marketAssignmentId:'new',market:'MM Neuer Markt'}];
 const before=JSON.stringify(periods);assert.equal(marketLineageText(periods),'Alter Markt bis Februar 2026 · Neuer Markt ab März 2026.');assert.equal(JSON.stringify(periods),before);assert.equal(marketLineageText(undefined),null);assert.equal(marketLineageText([]),null);
});
