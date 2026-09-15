// Each grand course has a 3× wider and 3× longer world, with one at-grade crossing.
const desktop=[[-116,0],[-78,0],[-30,0],[0,0],[30,0],[76,0],[119,0],[128,-20],[103,-36],[73,-26],[47,-35],[45,-57],[80,-68],[119,-63],[128,-83],[104,-88],[65,-88],[25,-88],[-15,-88],[-57,-88],[-103,-88],[-125,-70],[-119,-48],[-91,-42],[-64,-53],[-40,-42],[-20,-54],[-4,-45],[0,-25],[0,0],[0,28],[25,45],[53,35],[83,43],[117,28],[128,49],[118,78],[81,88],[50,77],[20,88],[-15,90],[-48,82],[-88,88],[-124,80],[-128,57],[-104,40],[-72,51],[-47,40],[-39,22],[-59,17],[-88,25],[-119,23]];
// Sweeping diagonal channels join two asymmetric lobes around bath-toy islands.
const bath=[[-112,-75],[-75,-50],[-30,-20],[0,0],[30,20],[75,50],[112,75],[128,83],[131,57],[105,39],[114,12],[128,-18],[125,-63],[102,-86],[71,-79],[54,-48],[30,-20],[0,0],[-30,20],[-75,50],[-112,75],[-129,78],[-130,51],[-108,32],[-83,24],[-69,2],[-93,-12],[-123,-20],[-130,-48]];
// A comb of northern switchbacks feeds a broad southern rally loop and a tight return.
const garden=[[-120,0],[-75,0],[-30,0],[0,0],[30,0],[75,0],[120,0],[130,-22],[130,-72],[114,-88],[91,-86],[78,-68],[78,-32],[60,-22],[40,-34],[40,-70],[23,-87],[0,-88],[-16,-68],[-40,-86],[-80,-88],[-118,-86],[-129,-62],[-109,-42],[-80,-25],[-52,-37],[-30,-56],[-5,-46],[0,-25],[0,0],[0,28],[25,49],[60,31],[100,25],[128,42],[128,77],[103,89],[76,70],[42,85],[0,90],[-40,90],[-80,90],[-118,88],[-129,67],[-110,47],[-77,42],[-49,57],[-26,44],[-38,23],[-76,22],[-111,24]];
// A real circuit: a big bay lobe hugs the open coastline (Harbour Exit onto
// the Bay Straight, the Coastal Sweeper, the Lighthouse Point hairpin, the
// Reef Chicane, Riptide Bend) and a tighter dune lobe cuts inland (Dune
// Gate, the Dune Chicane, the Dune Hollow hairpin). Both lobes close back to
// the shared coastal junction via their OWN dedicated return leg (north out
// of the bay, west out of the dune loop) rather than doubling back through
// each other's territory — verified by simulating the actual sampled curve:
// every part of the lap stays 15+ units clear of every other non-adjacent
// part, well outside the ~14-unit exclusion 'course.intersection' uses to
// keep barriers off the junction. Stays within x:[-140,178] z:[-86,198]; the
// shoreline (beyond x=195/z=215) and dune band (beyond x=-160/z=-105) never
// reach it — see buildGrandWorld's theme===3 block in game.mjs.
const shore=[[0,0],[36,24],[65,28],[105,38],[140,58],[165,90],[178,128],[174,160],[148,188],[108,198],[72,182],[80,148],[52,128],[66,96],[50,60],[0,90],[0,0],[0,-25],[-45,-38],[-36,-62],[-58,-80],[-92,-86],[-124,-72],[-140,-42],[-126,-8],[-98,12],[-40,0]];
export function grandCourses(originals){return [
 {base:0,name:'Stationery Speedway',tag:'THE DESKTOP GRAND TOUR',desc:'Race beneath toy robots, rockets and a giant desk lamp.<br>Thread the craft supplies and dodge the desk fan.',tags:['CROSS TRAFFIC','DESK FAN','STRAIGHT JUMPS'],hazard:'fan',hazardLabel:'DESK FAN · SIDE DRAFT',hazardAnchor:[100,-35],jumpAnchors:[[70,0],[-15,-88]],points:desktop,mapSize:[282,204],width:8.6},
 {base:1,name:'Bubble Basin Endurance',tag:'THE BATHTUB GRAND TOUR',desc:'Cruise past a giant octopus, toy submarines and bubble bottles.<br>Weave through bath toys and cross the current.',tags:['CROSS TRAFFIC','DRAIN CURRENT','STRAIGHT JUMPS'],hazard:'drain',hazardLabel:'DRAIN CURRENT · SIDE PULL',hazardAnchor:[128,-30],jumpAnchors:[[73,49],[-73,49]],points:bath,mapSize:[285,207],width:9.2},
 {base:2,name:'Wild Creek Rally',tag:'THE GARDEN GRAND TOUR',desc:'Rally past a towering dinosaur, slide and flowerpots.<br>Thread the garden toys and splash across the creek.',tags:['CROSS TRAFFIC','RUNNING CREEK','STRAIGHT JUMPS'],hazard:'stream',hazardLabel:'RUNNING CREEK · SIDE CURRENT',hazardAnchor:[130,-48],jumpAnchors:[[70,0],[-62,90]],points:garden,mapSize:[285,207],width:8.8},
 {base:3,name:'Shifting Sands Grand Prix',tag:'THE BEACH GRAND TOUR',desc:'Sweep the Bay Straight into the Lighthouse Point hairpin.<br>Thread the Reef Chicane, then cut inland through Dune Hollow.',tags:['LIGHTHOUSE HAIRPIN','RIP CURRENT','DUNE HOLLOW'],hazard:'stream',hazardLabel:'RIP CURRENT · SIDE PULL',hazardAnchor:[50,60],jumpAnchors:[[105,38],[-58,-80]],points:shore,mapSize:[460,500],width:9}
 ].map(c=>({...originals[c.base],...c,sampledPath:false,barrierOffset:.18,revision:c.base===0?1:2,mapScale:3,bounds:[c.mapSize[0]/2-4,c.mapSize[1]/2-4],extraJumps:[],intersection:{x:0,z:0,radius:c.base===1?11:c.base===3?14:c.width*.88},grand:true,points:c.points.map(([x,z])=>[x,0,z])}));}
