import test from 'node:test';import assert from 'node:assert/strict';
import {signedChartAxis,chartRatio} from '../app/lib/signedChart.ts';
test('signed charts keep all finite negative and positive values inside their real range',()=>{
 const values=[-150,-3,0,50,200,null,NaN];const axis=signedChartAxis(values);assert.deepEqual(axis,{min:-150,max:200,span:350});for(const n of values.filter(Number.isFinite))assert.ok(chartRatio(n,axis)>=0&&chartRatio(n,axis)<=1);assert.equal(chartRatio(-150,axis),0);assert.equal(chartRatio(200,axis),1);assert.ok(chartRatio(0,axis)>0);
 assert.deepEqual(signedChartAxis([null,NaN]),{min:0,max:100,span:100});assert.deepEqual(signedChartAxis([0,95],110),{min:0,max:110,span:110});
});
