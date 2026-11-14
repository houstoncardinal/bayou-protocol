import numpy as np, json, sys
import matplotlib; matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.colors import LinearSegmentedColormap, LightSource
h = np.load('height.npy'); meta = json.load(open('meta.json')); tm = json.load(open('timings.json')); S = 0.88
E = 100; ext = [-E, E, -E, E]
cmap = LinearSegmentedColormap.from_list('t', [(0, '#3f6f3a'), (0.12, '#5f8a45'), (0.22, '#8c9a62'), (0.35, '#8b8273'), (0.6, '#77736d'), (0.85, '#bdbbb6'), (1, '#f6f7f9')])
rgb = LightSource(azdeg=315, altdeg=35).shade(h, cmap=cmap, vert_exag=1.4, blend_mode='overlay', dx=0.25, dy=0.25)
fig, ax = plt.subplots(figsize=(11, 11), dpi=110); ax.imshow(rgb, origin='lower', extent=ext)
col = {'mid_T': '#8ecae6', 'mid_CT': '#8ecae6', 'A_main': '#ffd166', 'A_ramp': '#ffd166', 'B_approach': '#ef8354', 'B_lower': '#ef8354', 'B_window': '#ef8354',
       'CT_to_A': '#90caf9', 'CT_to_B': '#90caf9', 'gorge': '#4cc9f0', 'gorge_W': '#4cc9f0', 'gorge_E': '#4cc9f0', 'A_overlook_ramp': '#90caf9'}
for k, pts in meta['lanes'].items():
    if k in col and len(pts) > 1:
        p = np.array(pts); ax.plot(p[:, 0], p[:, 1], color=col[k], lw=2.2, alpha=0.9, ls='-' if 'gorge' not in k else (0, (4, 2)))
# bridge
a = meta['lanes']['mid_T'][-1]; b = meta['lanes']['mid_CT'][0]
ax.plot([a[0], b[0]], [a[1], b[1]], color='#b5835a', lw=7, solid_capstyle='butt'); ax.plot([a[0], b[0]], [a[1], b[1]], color='#8ecae6', lw=2)
# tunnels
for k, (p0, p1) in meta['secrets'].items():
    c = '#f4a261' if k == 'B_tunnels' else '#c77dff'
    ax.plot([p0[0], p1[0]], [p0[1], p1[1]], ls=(0, (3, 2)), color=c, lw=3)
    ax.scatter([p0[0], p1[0]], [p0[1], p1[1]], s=45, facecolor=c, edgecolor='k', zorder=5)
for t, (x, y) in meta['spawns'].items():
    ax.scatter([x], [y], s=700, marker='s', color='#d4a017' if t == 'T' else '#2f6db5', edgecolor='w', lw=2, zorder=6)
    ax.text(x, y, t, color='w', ha='center', va='center', fontsize=12, weight='bold', zorder=7)
for s_, v in meta['bomb_sites'].items():
    ax.add_patch(plt.Circle(v['center'], v['radius'], fill=False, ec='#ff3b3b', lw=2.5, ls='--', zorder=6))
    ax.text(*v['center'], s_, color='#ff3b3b', fontsize=24, weight='bold', ha='center', va='center', zorder=7)
lab = dict(fontsize=8.5, color='w', weight='bold', ha='center', bbox=dict(boxstyle='round,pad=0.25', fc='#000000b0', ec='none'))
for txt, x, y in [('A MAIN', -66, -20), ('A DOORS', -40, 18), ('A RAMP', -14, 18), ('QUARRY\nOVERLOOK', -66, 62), ('MID', 9, -40), ('BRIDGE', 10, -6),
                  ('MID DOORS', 23, 24), ('CREEK GORGE (lower route)', -16, -23), ('B LOWER', 60, -2), ('B WINDOW', 26, 6), ('SAWMILL\nLOFT', 60, 58),
                  ('CT → A', -16, 60), ('CT → B', 24, 60)]:
    ax.text(x * S, y * S, txt, **lab)
sl = {**lab, 'color': '#e0aaff'}
ax.text(-22, -44, "SMUGGLER'S CAVE\n(secret)", **sl); ax.text(25, 33, 'OLD DRIFT\n(secret, CT)', **sl); ax.text(55, -38, 'B TUNNELS\n(mine)', **{**lab, 'color': '#f4a261'})
ax.text(-97, -97, 'Run times @ 6 m/s\n' + '\n'.join(f'{k}: {v:.0f}s' for k, v in tm.items()), fontsize=8, color='w', va='bottom',
        bbox=dict(boxstyle='round,pad=0.4', fc='#000000b8', ec='none'))
ax.set_xlim(-E, E); ax.set_ylim(-E, E); ax.set_xticks(range(-100, 101, 25)); ax.set_yticks(range(-100, 101, 25))
ax.set_title('Ridgeback Pass v3 — compact defusal layout (200 m × 200 m, grid = 25 m)', fontsize=12)
plt.tight_layout(); plt.savefig(sys.argv[1])
