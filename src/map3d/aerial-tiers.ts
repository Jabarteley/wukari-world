/**
 * OWNER: world
 * How tall each open city's aerial skyline may grow (./aerial-plan.ts): a curated tier per city id, from general knowledge of the real
 * city's size and skyline. 0 hamlet or outpost, 1 town, 2 regional city, 3 large city, 4 global skyline city with 200 m+ towers.
 * A `~` marks a city whose historic centre is low-rise (its towers stand outside it). An id not listed falls back to the pack's
 * area-and-roads estimate, capped at tier 3. Part of the lazy aerial chunk; no imports.
 */
export const TIER_CAP_M: readonly number[] = Object.freeze([12, 25, 70, 150, 300]);
const TIERS = [
  'alofi flying-fish-cove kingston-nf brades villa-las-estrellas adamstown cove grytviken port-aux-francais siachen west-island ashmore chagos',
  'ota ijebu-ode sagamu umuahia yenagoa awka gombe damaturu jalingo lafia birnin-kebbi gusau dutse abakaliki apia maseru mbabane malabo moroni praia sao-tome victoria bissau honiara dili koror majuro nukualofa tarawa port-vila andorra-la-vella basseterre bridgetown castries kingstown roseau st-georges belize-city georgetown paramaribo thimphu vaduz valletta~ palikir st-johns yaren san-marino~ funafuti vatican-city~ cockburn-town douglas garapan george-town gustavia kyrenia mariehamn pago-pago papeete philipsburg st-peter-port stanley the-valley torshavn avarua charlotte-amalie hagatna hamilton marigot nuuk oranjestad road-town jamestown mata-utu st-helier saint-pierre',
  'port-harcourt kano enugu benin-city kaduna jos ilorin maiduguri abeokuta owerri uyo calabar akure osogbo sokoto katsina bauchi makurdi minna yola ado-ekiti asaba lokoja lome yaounde cotonou kigali lusaka gaborone harare maputo windhoek bamako lilongwe ouagadougou brazzaville libreville tunis antananarivo bujumbura ndjamena asmara bangui conakry djibouti mogadishu monrovia niamey nouakchott port-louis freetown juba serekunda hargeisa laayoune wellington dublin~ suva asuncion bishkek bratislava chisinau dushanbe ashgabat guatemala-city kathmandu la-paz ljubljana~ luxembourg managua muscat podgorica quito reykjavik riga~ san-jose san-salvador sarajevo skopje sofia tallinn~ tbilisi tegucigalpa tirana ulaanbaatar vientiane vilnius~ yerevan zagreb kingston yangon kabul sanaa port-au-prince brasilia port-moresby port-of-spain zurich~ oslo helsinki male ramallah pristina larnaca montevideo nassau noumea san-juan willemstad bsb',
  'abuja ibadan accra algiers nairobi abidjan addis-ababa cape-town dakar cairo rabat luanda dar-es-salaam kinshasa khartoum tripoli kampala bogota buenos-aires lima auckland rome~ amman baku beirut belgrade bucharest budapest~ caracas colombo minsk phnom-penh tashkent almaty copenhagen~ damascus dhaka lisbon~ prague~ vienna~ delhi lahore madrid athens baghdad berlin brussels amsterdam~ istanbul pyongyang tehran warsaw kyiv stockholm macau manama monaco havana~ santo-domingo',
  'lagos singapore hong-kong new-york london paris~ tokyo shanghai dubai sao-paulo seoul toronto kuala-lumpur bangkok jakarta manila mexico-city moscow sydney riyadh doha kuwait-city taipei ho-chi-minh-city tel-aviv-yafo panama-city santiago',
];
let table: Map<string, { tier: number; lowCore: boolean }> | null = null;
/** A city's curated tier, and whether its historic centre stays low; null for an id not listed. */
export function cityTier(id: string): { tier: number; lowCore: boolean } | null {
  if (!table) {
    table = new Map();
    TIERS.forEach((ids, tier) => { for (const word of ids.split(' ')) table!.set(word.replace('~', ''), { tier, lowCore: word.endsWith('~') }); });
  }
  return table.get(id) ?? null;
}
