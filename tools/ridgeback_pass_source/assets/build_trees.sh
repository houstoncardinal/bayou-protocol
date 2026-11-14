#!/bin/bash
# tree batch: name gltf mesh_index trunkTris branchTris
set -e
cd /home/claude/v3/assets
run() { name=$1; g=$2; mi=$3; tt=$4; bt=$5
  python3 tree_cards.py $g $mi out/$name > out/$name.log 2>&1
  python3 tree_build.py out/$name $g $name >> out/$name.log 2>&1
  (cd /home/claude/node && node simplify_parts.mjs /home/claude/v3/assets/out/${name}_raw.glb /home/claude/v3/assets/out/$name.glb "{\"trunk\":$tt,\"branches\":$bt}" 2048 && node simplify_parts.mjs /home/claude/v3/assets/out/${name}_bb_raw.glb /home/claude/v3/assets/out/${name}_bb.glb '{}' 512) >> out/$name.log 2>&1
  rm -f out/${name}_parts.npz
  echo "done $name $(grep -E 'cards [0-9]+ ' out/$name.log | head -1)"
}
PH=/home/claude/ph/models
# run fir_a $PH/fir_tree_01/fir_tree_01_1k.gltf 0 900 1400
# run fir_b $PH/fir_tree_01/fir_tree_01_1k.gltf 1 800 1100
run fir_c $PH/fir_tree_01/fir_tree_01_1k.gltf 2 700 1100
run pine_a $PH/pine_tree_01/pine_tree_01_1k.gltf 0 900 1400
run pine_b $PH/pine_tree_01/pine_tree_01_1k.gltf 1 800 1200
run pine_c $PH/pine_tree_01/pine_tree_01_1k.gltf 2 700 1300
run firsap_a $PH/fir_sapling_medium/fir_sapling_medium_1k.gltf 0 500 900
run firsap_b $PH/fir_sapling_medium/fir_sapling_medium_1k.gltf 1 400 700
run bush_pine_a $PH/pine_sapling_small/pine_sapling_small_1k.gltf 1 150 150
run bush_fir_a $PH/fir_sapling/fir_sapling_1k.gltf 0 200 200
echo ALLDONE
