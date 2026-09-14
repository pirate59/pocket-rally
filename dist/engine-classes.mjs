export const ENGINE_CLASSES=Object.freeze({
 commercial:{name:'Commercial',multiplier:1},
 sport:{name:'Sport',multiplier:1.25},
 racing:{name:'Racing',multiplier:1.5}
});
export const engineClass=value=>Object.hasOwn(ENGINE_CLASSES,value)?value:'commercial';
export const engineMultiplier=value=>ENGINE_CLASSES[engineClass(value)].multiplier;
// Preserve Commercial records. Revised classes start fresh without deleting
// times recorded with the previous, faster engines.
export const engineRecordSuffix=value=>engineClass(value)==='commercial'?'':'-engine-'+engineClass(value)+'-v2';
export const isBraking=(throttle,handbrake,speed)=>!!handbrake||(throttle<-.05&&speed>-.5)||(throttle>.05&&speed<-.5);
