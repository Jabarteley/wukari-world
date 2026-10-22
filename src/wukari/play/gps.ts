export interface GpsSample {longitude:number;latitude:number;accuracy:number;timestamp:number}
export function gpsReport(samples:GpsSample[],gate:'main'|'second',witnessed:boolean){
 const usable=samples.filter(p=>Number.isFinite(p.longitude+p.latitude+p.accuracy+p.timestamp)&&Math.abs(p.longitude)<=180&&Math.abs(p.latitude)<=90&&p.accuracy>=0&&p.accuracy<=15);
 const median=(values:number[])=>{const a=values.slice().sort((a,b)=>a-b);return a.length%2?a[(a.length-1)/2]!:((a[a.length/2-1]??0)+(a[a.length/2]??0))/2;};
 const coordinate=usable.length?[median(usable.map(p=>p.longitude)),median(usable.map(p=>p.latitude))]:null;
 const duration=usable.length>1?(Math.max(...usable.map(p=>p.timestamp))-Math.min(...usable.map(p=>p.timestamp)))/1000:0;
 return {type:'FeatureCollection',features:coordinate?[{type:'Feature',geometry:{type:'Point',coordinates:coordinate},properties:{gate,source:'Firsthand browser geolocation; owner export',witnessed,usableSamples:usable.length,durationSeconds:duration,medianReportedAccuracyM:median(usable.map(p=>p.accuracy)),status:usable.length>=10&&duration>=30&&witnessed?'Field report ready for independent review; not automatic verification':'Insufficient evidence; repeat measurement',note:'Reported device accuracy is not surveyed accuracy. No public access or campus boundary inferred.'}}]:[],samples,policy:'Private local recording only; no upload, app import or spawn enabled.'};
}
