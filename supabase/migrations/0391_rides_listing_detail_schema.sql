-- 0391: ride offer/request detail schema — origin/dest geo + departs + seats.

begin;

update public.listing_kinds
   set detail_schema = '{
     "type":"object",
     "required":["origin_lat","origin_lng","dest_lat","dest_lng","departs_at","seats_available"],
     "properties":{
       "origin_label":{"type":"string"},
       "dest_label":{"type":"string"},
       "origin_lat":{"type":"number"},
       "origin_lng":{"type":"number"},
       "dest_lat":{"type":"number"},
       "dest_lng":{"type":"number"},
       "departs_at":{"type":"string","format":"date-time"},
       "seats_available":{"type":"integer","minimum":1,"maximum":8},
       "cargo_items":{"type":"boolean"},
       "reward_model":{"enum":["free","expense_share"]}
     }
   }'::jsonb
 where world_slug = 'rides' and slug = 'ride_offer';

update public.listing_kinds
   set detail_schema = '{
     "type":"object",
     "required":["origin_lat","origin_lng","dest_lat","dest_lng","departs_at","passengers"],
     "properties":{
       "origin_label":{"type":"string"},
       "dest_label":{"type":"string"},
       "origin_lat":{"type":"number"},
       "origin_lng":{"type":"number"},
       "dest_lat":{"type":"number"},
       "dest_lng":{"type":"number"},
       "departs_at":{"type":"string","format":"date-time"},
       "passengers":{"type":"integer","minimum":1,"maximum":8},
       "luggage":{"type":"boolean"}
     }
   }'::jsonb
 where world_slug = 'rides' and slug = 'ride_request';

commit;
