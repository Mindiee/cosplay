import {createStudioRenderer} from './studio-renderer.js';
import {profileStudio} from './studio-domain.js';

export function createHeroStudio(host,state,catalog,onStatus=()=>{}){
  const renderer=createStudioRenderer(host,onStatus);
  const update=next=>{
    const profile=profileStudio(next,next.settings.currentUserId);
    renderer.update({style:profile.style,body:profile.bodies[profile.style],outfit:profile.outfit,listings:next.listings,bodies:catalog?.bodies});
  };
  update(state);
  renderer.view(0);
  return {update,dispose:()=>renderer.dispose()};
}
