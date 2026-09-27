export const OCCASION_CATEGORIES=Object.freeze(['costume','travel','outdoor','formal','event']);
export const OCCASION_LABELS=Object.freeze({
  costume:{title:'Costume',subtitle:'Cosplay / Costume'},
  travel:{title:'Travel',subtitle:'เสื้อกันหนาว'},
  outdoor:{title:'Outdoor',subtitle:'Hiking / Camping'},
  formal:{title:'Formal',subtitle:'สูท / ชุดออกงาน'},
  event:{title:'Event',subtitle:'ชุดธีม / Festival'},
});

export function normalizeOccasionCategories(state){
  for(const listing of state.listings||[])if(!OCCASION_CATEGORIES.includes(listing.occasionCategory))listing.occasionCategory='costume';
  return state;
}
