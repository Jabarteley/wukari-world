[out:json][timeout:25];
area["ISO3166-1"="NG"]["admin_level"="2"]->.nigeria;
nwr(area.nigeria)["amenity"="university"]["name"~"Federal University.*Wukari",i];
out meta geom;
