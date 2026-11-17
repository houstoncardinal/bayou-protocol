/* ===== Bayou Protocol mod: credits ===== */
// The About screen's credits list (the core's wBA table: [what, source, licence]), kept in step with
// CREDITS.md, which has the links and notes. Author, title and licence of each Sketchfab model come from the
// metadata Sketchfab writes into the downloaded file.
wBA.length = 0;
wBA.push(
  ['Kodiak 7.62 (AK) arms and rifle', '“FPS Character Animation Pack Ak-47” by Cristian David Duque Camacho (sketchfab.com/DuqueCD7)', 'CC BY 4.0'],
  ['Sentinel M4A1 arms and carbine', '“fps animated carbine” by DJMaesen (sketchfab.com/bumstrum)', 'CC BY 4.0'],
  ['Phantom 12.7 arms and rifle', '“sniper animated” by DJMaesen (sketchfab.com/bumstrum)', 'CC BY 4.0'],
  ['First-person arms (Warden, Talon, Rampart, Bastion)', '“Arms6” by DJMaesen (sketchfab.com/bumstrum)', 'CC BY 4.0'],
  ['Hornet .45, Mauler 12, Kestrel 9, Anvil 7.62, knife', '“fps animated smg”, “shotgun animated”, “fps pistol Animated”, “lmg animated”, “knife Animated” by DJMaesen (sketchfab.com/bumstrum)', 'CC BY 4.0'],
  ['Striker 17', '“G17 Pistol - Animated” by user77 (sketchfab.com/user77)', 'CC BY 4.0'],
  ['Midas 7.62', '“Gold AK-47 - Game Ready Assault Rifle Weapon” by Billy Jackman (sketchfab.com/billyjackman3d)', 'CC BY 4.0'],
  ['Bastion 7.62', '“FN SCAR-17” by witt-commando(RC-3106) (sketchfab.com/gsilvacordova)', 'CC BY 4.0'],
  ['Talon 5.56', '“low-poly G95 A1” by D_U (sketchfab.com/DU1701), re-finished for the game', 'CC BY 4.0'],
  ['Warden 9', '“Beretta APX A1 Full Size Tactical Green” by geyges (sketchfab.com/geyges)', 'Sketchfab Standard'],
  ['Rampart 7.62', 'SCAR rifle model; the original author was not recorded', 'Unknown'],
  ['Frag grenade', '“FPS Guns 4K - Frag Granade” by Heart State Games® (sketchfab.com/heartstategames), unmodified', 'CC BY-ND 4.0'],
  ['Characters and animations', 'Mixamo (Adobe): characters Ch10, Ch15, Ch18, Ch35, the Ch36 desert operator, The Boss and the Ch08 inmate; the Auto-Rigger (Ghost) and their rifle, movement and death animations', 'Mixamo terms of use'],
  ['Terrorist “Ghost”', '“Gas Mask Guy” by modellerschool (sketchfab.com/modellerschool), rigged with Mixamo', 'CC BY 4.0'],
  ['Terrorist “Wraith”', '“terrorist” by DJMaesen (sketchfab.com/bumstrum), Mixamo animations retargeted', 'CC BY 4.0'],
  ['Balaclava (Kastor)', '“Knitted Ski Mask / Ribbed Knit Balaclava” by SKVORSOW (sketchfab.com/SKVORSOW)', 'CC BY 4.0'],
  ['Ridgeback Pass map', 'Ridgeback Pass v4: terrain, textures, trees, rocks, plants, props and sky from Poly Haven (polyhaven.com)', 'CC0'],
  ['Bayou Palace Cinemas map', 'Poly Haven (polyhaven.com): poly_wool_herringbone, velour_velvet, marble_01, herringbone_parquet, dark_wooden_planks, white_stucco, leather_red_02, terrazzo_tiles, quatrefoil_jacquard_fabric, wood_plank_wall, marble_mosaic_tiles textures; Chandelier_02, CashRegister_01, bar_chair_round_01, Sofa_01, coffee_table_round_01, potted_plant_02, street_lamp_01, metal_trash_can, ornate_mirror_01, mid_century_lounge_chair, fancy_picture_frame_01, brass_vase_01, modern_ceiling_lamp_01, CoffeeCart_01, ArmChair_01, potted_plant_04, side_table_01, industrial_storage_cart, steel_frame_shelves_02, cardboard_box_01 models', 'CC0'],
  ['Films on the cinema screens', 'Blender Foundation open movies (Big Buck Bunny, Sintel, Tears of Steel, Spring, Agent 327), played through YouTube', 'CC BY'],
  ['Blackwater Penitentiary map', 'Poly Haven (polyhaven.com): painted_brick, painted_plaster_wall, garage_floor, large_grey_tiles, concrete_wall_008, concrete_floor_worn_001, asphalt_02, red_brick_03, granite_wall, green_metal_rust, metal_plate, sparse_grass, brown_mud_dry, rubber_tiles, tarred_gravel, corrugated_iron textures; kloofendal_48d_partly_cloudy_puresky and industrial_sunset_02_puresky skies; security_camera_01, mounted_fluorescent_lights, hanging_industrial_lamp, Television_01, steel_frame_shelves_01, metal_office_desk, utility_box_02, korean_fire_extinguisher_01, wheelchair_01, trashbag, concrete_road_barrier, barrel_03, bolt_cutters_01, security_light, WetFloorSign_01, fire_hydrant models', 'CC0'],
  ['Frostline map', 'Poly Haven (polyhaven.com): snow_02, rock_face, brown_planks_05, blue_metal_plate, weathered_plank_siding, rustic_stone_wall and roof_planks textures; the snowy_hillside sky; rock_face_02, wooden_crate_02, old_military_crate, barrel_03, metal_jerrycan, portable_generator, portable_searchlight, dead_tree_trunk, street_lamp_02, wooden_lantern_01, barrel_stove, stone_fire_pit, wooden_barrels_01, cardboard_box_01, ammo_box, wooden_crate_01, tree_stump_01 and wooden_bucket_01 models', 'CC0'],
  ['Crates', '“Crate box” by KloWorks (sketchfab.com/kloworks); “Secure Box Crates Type A” by Mad_Lobster_Workshop (sketchfab.com/Mad_Lobster_Workshop); “TNT crate” by hopefuldesign (sketchfab.com/hopefuldesign); “Crates And Barrels” by Mateusz Woliński (sketchfab.com/jeandiz)', 'CC BY 4.0'],
  ['Fir trees and daisies', '“Realistic fir trees pack (LODS, gameready)” and “Daisy models pack (realistic, optimized)” by LOLIPOP (sketchfab.com/lolipop_1707)', 'CC BY 4.0'],
  ['Conifers', '“Conifer Tree (high-Poly)” by Sereib (sketchfab.com/Sereib)', 'CC BY 4.0'],
  ['Cacti', '“Cacti” by evolveduk (sketchfab.com/evolveduk)', 'Sketchfab Standard'],
  ['Cars and street props', 'Kenney and Quaternius', 'CC0'],
  ['Gun sounds', 'Snake’s Authentic Gun Sounds pack 2, F8 Studios (f8studios.itch.io)', 'As published by the author'],
  ['Photo textures and HDR skies', 'three.js examples; Poly Haven', 'CC0'],
  ['Ground and rock textures', 'Poly Haven (rocky trail, cracked earth, coastal rocks, aerial rocks), via the PlayCanvas examples', 'CC0'],
  ['three.js, React, React Three Fiber, drei, zustand, meshoptimizer', 'Rendering, interface and 3D components', 'MIT licence'],
  ['Rapier', 'Physics engine (@dimforge/rapier3d-compat)', 'Apache 2.0'],
  ['Big Shoulders Display, Barlow', 'Typefaces', 'SIL Open Font Licence 1.1'],
);
