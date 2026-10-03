import {motionTimeout,clearMotionTimeout} from './frame.js';
import {exhibitByKey} from './catalog.js';
import {motion} from './core.js';
export const guidePoses=[['wink','眨眼比耶','guide-bust.webp'],['proud','得意','guide-proud.webp'],['explain','认真讲解','guide-explain.webp'],['ears','捂耳朵','guide-ears.webp'],['yawn','慢放打哈欠','guide-yawn.webp']];
const face=document.querySelector('#dialog .face'),image=face.querySelector('img');let current='wink',key=null,temporary=0,impactPoseActive=false;
face.setAttribute('role','button');face.tabIndex=0;face.title='点一下，看看导览员的表情';
function setPose(pose){const data=guidePoses.find(p=>p[0]===pose);if(!data||current===pose)return;current=pose;image.src=new URL(`../../assets/city-web/${data[2]}`,import.meta.url).href;image.alt=`导览员：${data[1]}`;face.dataset.pose=pose;face.setAttribute('aria-label',`${data[1]}，点击切换表情`);}
function contextual(){if(impactPoseActive)return setPose('ears');if(motion.speed<=.1)return setPose('yawn');const hall=exhibitByKey.get(key)?.hall;setPose(['text','timing','scroll','shader'].includes(hall)?'explain':['gesture','transition'].includes(hall)?'proud':'wink');}
const cycle=()=>{clearMotionTimeout(temporary);impactPoseActive=false;setPose(guidePoses[(guidePoses.findIndex(p=>p[0]===current)+1)%guidePoses.length][0]);};face.onclick=cycle;face.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();cycle();}};
addEventListener('exhibit-say',e=>{key=e.detail.key;clearMotionTimeout(temporary);impactPoseActive=false;contextual();});addEventListener('motion-playback',contextual);
addEventListener('motion-impact',()=>{clearMotionTimeout(temporary);impactPoseActive=true;setPose('ears');temporary=motionTimeout(()=>{impactPoseActive=false;contextual();},1400/Math.max(.1,motion.speed));});
// Expression images load when the guide actually uses them.
face.dataset.pose='wink';face.setAttribute('aria-label','眨眼比耶，点击切换表情');
