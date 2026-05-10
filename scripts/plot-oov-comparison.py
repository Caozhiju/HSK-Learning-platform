"""
Figure: HSK 1-3 超纲词等级分布 — 修正前后对比
Nature-style grouped bar chart, 3 panels
"""
import matplotlib.pyplot as plt
import matplotlib.ticker as ticker
import matplotlib.font_manager as fm
import numpy as np

# CJK font setup
font_path = 'C:/Windows/Fonts/msyh.ttc'  # Microsoft YaHei
try:
    fm.fontManager.addfont(font_path)
    prop = fm.FontProperties(fname=font_path)
    plt.rcParams['font.family'] = prop.get_name()
except:
    pass
plt.rcParams['axes.unicode_minus'] = False

# ── Data ──────────────────────────────────────────────────
target_levels = [1, 2, 3]
labels = ["HSK 1", "HSK 2", "HSK 3"]

# Original OOV counts by target → oov_level
orig_data = {
    1: {2: 95, 3: 129, 4: 122, 5: 85, 6: 50, 7: 47},
    2: {3: 139, 4: 200, 5: 146, 6: 87, 7: 105},
    3: {4: 368, 5: 311, 6: 155, 7: 161},
}

rew_data = {
    1: {2: 44, 3: 54, 4: 35, 5: 41, 6: 22, 7: 20},
    2: {3: 59, 4: 59, 5: 67, 6: 21, 7: 27},
    3: {4: 105, 5: 79, 6: 40, 7: 44},
}

# ── Figure setup ──────────────────────────────────────────
fig, axes = plt.subplots(1, 3, figsize=(18, 5.5))
fig.patch.set_facecolor('white')

bar_width = 0.35
# Nature low-saturation palette
color_orig = '#7EA8BE'   # muted blue
color_rew  = '#E8A87C'   # muted orange

for idx, (tl, label) in enumerate(zip(target_levels, labels)):
    ax = axes[idx]

    oov_levels = sorted(orig_data[tl].keys())
    x = np.arange(len(oov_levels))

    orig_vals = [orig_data[tl].get(lv, 0) for lv in oov_levels]
    rew_vals  = [rew_data[tl].get(lv, 0) for lv in oov_levels]

    bars1 = ax.bar(x - bar_width/2, orig_vals, bar_width,
                   color=color_orig, edgecolor='white', linewidth=0.5,
                   label='Original (修正前)')
    bars2 = ax.bar(x + bar_width/2, rew_vals, bar_width,
                   color=color_rew, edgecolor='white', linewidth=0.5,
                   label='Rewritten (修正后)')

    # Clearance rate annotation
    for i, (orig, rew) in enumerate(zip(orig_vals, rew_vals)):
        if orig > 0:
            rate = (1 - rew / orig) * 100
            ax.text(x[i], max(orig, rew) + 2, f'{rate:.0f}%',
                    ha='center', fontsize=8, color='#555555', fontweight='bold')

    ax.set_title(label, fontsize=16, fontweight='bold', pad=12)
    ax.set_xticks(x)
    ax.set_xticklabels([f'HSK {lv}' for lv in oov_levels], fontsize=11)
    ax.set_ylabel('超纲词数量', fontsize=12, labelpad=8)
    ax.set_ylim(0, max(max(orig_vals), max(rew_vals)) * 1.25)
    ax.yaxis.set_major_locator(ticker.MaxNLocator(integer=True))

    # Clean spines
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    ax.spines['left'].set_color('#cccccc')
    ax.spines['bottom'].set_color('#cccccc')
    ax.tick_params(colors='#666666')
    ax.grid(axis='y', color='#eeeeee', linewidth=0.5)

# Shared legend
handles, labs = axes[0].get_legend_handles_labels()
fig.legend(handles, labs, loc='upper center', ncol=2,
           fontsize=12, frameon=False, bbox_to_anchor=(0.5, 1.02))

fig.suptitle('HSK 超纲词等级分布 — 修正前后对比',
             fontsize=18, fontweight='bold', y=1.08)

# 图例说明
fig.text(0.5, 0.91, '柱顶数字 = 清除率（即被修正的超纲词比例，越高越好）',
         ha='center', fontsize=10, color='#888888', style='italic')

fig.tight_layout(pad=2)

out_path = 'd:/OneDrive/Desktop/hsk-learning-platform/public/oov-comparison.svg'
plt.savefig(out_path, format='svg', dpi=300, bbox_inches='tight',
            facecolor='white', edgecolor='none')
plt.savefig(out_path.replace('.svg', '.png'), format='png', dpi=300,
            bbox_inches='tight', facecolor='white', edgecolor='none')
print(f'Figures saved to: {out_path}')
print(f'               {out_path.replace(".svg", ".png")}')
plt.close()
