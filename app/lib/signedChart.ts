/** Include zero and the target, preserving signed values inside the plot. */
export function signedChartAxis(values: readonly (number|null|undefined)[], reference=100) {
 const finite=values.filter((v):v is number=>typeof v==='number'&&Number.isFinite(v));
 const min=Math.min(0,...finite),max=Math.max(reference,...finite);
 return {min,max,span:max-min};
}
export const chartRatio=(value:number,axis:ReturnType<typeof signedChartAxis>)=>(value-axis.min)/axis.span;
