"""
Figure: 豆包 vs GPT — 超纲词等级分布
三面板，每面板 = 一个 HSK 目标等级，横轴 = 超纲词所属等级 (L2-L7)
"""
import matplotlib.pyplot as plt
import matplotlib.ticker as ticker
import matplotlib.font_manager as fm
import numpy as np
import re
from pathlib import Path
import openpyxl

# CJK font
font_path = 'C:/Windows/Fonts/msyh.ttc'
fm.fontManager.addfont(font_path)
plt.rcParams['font.family'] = fm.FontProperties(fname=font_path).get_name()
plt.rcParams['axes.unicode_minus'] = False

BASE = Path('d:/OneDrive/Desktop/豆包与chatgpt1-3级词汇生成文本及审查结果')
FILES = {
    ('doubao', 1): '豆包hsk1级词汇文本审查结果.xlsx',
    ('doubao', 2): 'doubaohsk2级文本检测结果.xlsx',
    ('doubao', 3): 'doubaohsk3级词汇文本审查结果.xlsx',
    ('gpt', 1): 'gpthsk1级词汇文本审查结果.xlsx',
    ('gpt', 2): 'gpthsk2级文本检测结果.xlsx',
    ('gpt', 3): 'gpshsk3级词汇文本审查结果.xlsx',
}

def get_oov_dist(filepath):
    """Return dict {level: count} for OOV words"""
    wb = openpyxl.load_workbook(BASE / filepath)
    ws = wb.active
    dist = {}
    for row in ws.iter_rows(min_row=2, values_only=True):
        oov_str = str(row[4] or '')
        for m in re.finditer(r'\((\d+)级\)', oov_str):
            lv = int(m.group(1))
            dist[lv] = dist.get(lv, 0) + 1
    return dist

doubao = {l: get_oov_dist(FILES[('doubao', l)]) for l in [1,2,3]}
gpt    = {l: get_oov_dist(FILES[('gpt', l)]) for l in [1,2,3]}

# ── Figure: 3 panels, one per target HSK level ─────────
fig, axes = plt.subplots(1, 3, figsize=(20, 5.5))
fig.patch.set_facecolor('white')

C_DOUBAO  = '#7EA8BE'
C_GPT     = '#E8A87C'
bar_w = 0.32
levels = [2,3,4,5,6,7]
titles = ['HSK 1 目标', 'HSK 2 目标', 'HSK 3 目标']

for pi, (target_lvl, title) in enumerate(zip([1,2,3], titles)):
    ax = axes[pi]
    x = np.arange(len(levels))

    d_vals = [doubao[target_lvl].get(lv, 0) for lv in levels]
    g_vals = [gpt[target_lvl].get(lv, 0) for lv in levels]

    b1 = ax.bar(x - bar_w/2, d_vals, bar_w, color=C_DOUBAO, edgecolor='white', lw=0.5,
                label='豆包 (Doubao)')
    b2 = ax.bar(x + bar_w/2, g_vals, bar_w, color=C_GPT, edgecolor='white', lw=0.5,
                label='ChatGPT')

    # 数值标注
    for bar in b1:
        h = bar.get_height()
        if h > 0:
            ax.text(bar.get_x() + bar.get_width()/2, h + 1, f'{int(h)}',
                    ha='center', fontsize=9, color=C_DOUBAO, fontweight='bold')
    for bar in b2:
        h = bar.get_height()
        if h > 0:
            ax.text(bar.get_x() + bar.get_width()/2, h + 1, f'{int(h)}',
                    ha='center', fontsize=9, color=C_GPT, fontweight='bold')

    # 汇总标注
    d_total = sum(d_vals)
    g_total = sum(g_vals)
    ax.text(0.02, 0.95, f'豆包: {d_total} 个超纲词\nGPT: {g_total} 个超纲词',
            transform=ax.transAxes, fontsize=10, color='#555',
            verticalalignment='top',
            bbox=dict(boxstyle='round,pad=0.3', facecolor='white', alpha=0.8, edgecolor='#ddd'))

    ax.set_title(title, fontsize=15, fontweight='bold', pad=12)
    ax.set_xticks(x)
    ax.set_xticklabels([f'HSK {lv} (L{lv})' for lv in levels], fontsize=11)
    ax.set_ylabel('超纲词数量', fontsize=12, labelpad=8)
    all_vals = d_vals + g_vals
    ax.set_ylim(0, max(all_vals) * 1.3 if all_vals else 10)
    ax.yaxis.set_major_locator(ticker.MaxNLocator(integer=True))

    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    ax.spines['left'].set_color('#ccc')
    ax.spines['bottom'].set_color('#ccc')
    ax.tick_params(colors='#666')
    ax.grid(axis='y', color='#eee', lw=0.5)

# Legend
handles, labs = axes[0].get_legend_handles_labels()
fig.legend(handles, labs, loc='upper center', ncol=2, fontsize=13, frameon=False,
           bbox_to_anchor=(0.5, 1.02))

fig.suptitle('豆包 vs ChatGPT — 超纲词等级分布（限定生成50字左右文本）', fontsize=18, fontweight='bold', y=1.10)
fig.tight_layout(pad=3)

out = 'd:/OneDrive/Desktop/hsk-learning-platform/public/oov-distribution'
plt.savefig(out + '.svg', format='svg', dpi=300, bbox_inches='tight', facecolor='white')
plt.savefig(out + '.png', format='png', dpi=300, bbox_inches='tight', facecolor='white')
print(f'Saved: {out}.png')
plt.close()
