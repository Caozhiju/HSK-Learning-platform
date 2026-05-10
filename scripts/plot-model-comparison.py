"""
Figure: 豆包 vs GPT — HSK 1-3 文本生成质量对比
三面板: 平均文本长度 / 平均超纲词数 / 超纲词等级分布
"""
import matplotlib.pyplot as plt
import matplotlib.ticker as ticker
import matplotlib.font_manager as fm
import numpy as np
import json, re, os
from pathlib import Path

# ── CJK Font ───────────────────────────────────────────
font_path = 'C:/Windows/Fonts/msyh.ttc'
fm.fontManager.addfont(font_path)
plt.rcParams['font.family'] = fm.FontProperties(fname=font_path).get_name()
plt.rcParams['axes.unicode_minus'] = False

# ── Load data ──────────────────────────────────────────
BASE = Path('d:/OneDrive/Desktop/豆包与chatgpt1-3级词汇生成文本及审查结果')
FILES = {
    ('豆包', 1): BASE / '豆包hsk1级词汇文本审查结果.xlsx',
    ('豆包', 2): BASE / 'doubaohsk2级文本检测结果.xlsx',
    ('豆包', 3): BASE / 'doubaohsk3级词汇文本审查结果.xlsx',
    ('GPT', 1): BASE / 'gpthsk1级词汇文本审查结果.xlsx',
    ('GPT', 2): BASE / 'gpthsk2级文本检测结果.xlsx',
    ('GPT', 3): BASE / 'gpshsk3级词汇文本审查结果.xlsx',
}

import openpyxl

def parse_data(filepath):
    wb = openpyxl.load_workbook(filepath)
    ws = wb.active
    lengths = []
    oov_counts = []
    oov_levels = {}  # {level: count}

    for row in ws.iter_rows(min_row=2, values_only=True):
        if not row[2]: continue
        text = str(row[2])
        lengths.append(len(text.replace(' ', '')))
        oov_counts.append(int(row[3] or 0))

        # Parse OOV levels from col 4: "散步(4级); 太阳(3级)"
        oov_str = str(row[4] or '')
        for m in re.finditer(r'\((\d+)级\)', oov_str):
            lv = int(m.group(1))
            oov_levels[lv] = oov_levels.get(lv, 0) + 1

    avg_len = np.mean(lengths) if lengths else 0
    avg_oov = np.mean(oov_counts) if oov_counts else 0
    return avg_len, avg_oov, oov_levels

doubao = {l: parse_data(FILES[('豆包', l)]) for l in [1,2,3]}
gpt    = {l: parse_data(FILES[('GPT', l)]) for l in [1,2,3]}

# ── Figure ─────────────────────────────────────────────
fig, axes = plt.subplots(1, 3, figsize=(20, 5.5))
fig.patch.set_facecolor('white')
x = np.arange(3)  # HSK 1,2,3

# Nature low-saturation palette
C_DOUBAO = '#7EA8BE'
C_GPT    = '#E8A87C'
bar_w = 0.32

# ── Panel A: Average Text Length ──────────────────────
ax = axes[0]
d_vals = [doubao[l][0] for l in [1,2,3]]
g_vals = [gpt[l][0] for l in [1,2,3]]
b1 = ax.bar(x - bar_w/2, d_vals, bar_w, color=C_DOUBAO, edgecolor='white', label='豆包')
b2 = ax.bar(x + bar_w/2, g_vals, bar_w, color=C_GPT, edgecolor='white', label='ChatGPT')
# Value labels
for bar in b1: ax.text(bar.get_x()+bar.get_width()/2, bar.get_height()+1, f'{bar.get_height():.0f}', ha='center', fontsize=10, color='#555')
for bar in b2: ax.text(bar.get_x()+bar.get_width()/2, bar.get_height()+1, f'{bar.get_height():.0f}', ha='center', fontsize=10, color='#555')
ax.set_title('平均文本长度（字）', fontsize=14, fontweight='bold', pad=10)
ax.set_xticks(x)
ax.set_xticklabels(['HSK 1', 'HSK 2', 'HSK 3'], fontsize=12)
ax.set_ylim(0, max(max(d_vals), max(g_vals)) * 1.2)
ax.spines['top'].set_visible(False); ax.spines['right'].set_visible(False)
ax.spines['left'].set_color('#ccc'); ax.spines['bottom'].set_color('#ccc')
ax.grid(axis='y', color='#eee', lw=0.5)

# ── Panel B: Average OOV Count ────────────────────────
ax = axes[1]
d_vals = [doubao[l][1] for l in [1,2,3]]
g_vals = [gpt[l][1] for l in [1,2,3]]
b1 = ax.bar(x - bar_w/2, d_vals, bar_w, color=C_DOUBAO, edgecolor='white')
b2 = ax.bar(x + bar_w/2, g_vals, bar_w, color=C_GPT, edgecolor='white')
for bar in b1: ax.text(bar.get_x()+bar.get_width()/2, bar.get_height()+0.15, f'{bar.get_height():.1f}', ha='center', fontsize=10, color='#555')
for bar in b2: ax.text(bar.get_x()+bar.get_width()/2, bar.get_height()+0.15, f'{bar.get_height():.1f}', ha='center', fontsize=10, color='#555')
ax.set_title('平均超纲词数（个/条）', fontsize=14, fontweight='bold', pad=10)
ax.set_xticks(x)
ax.set_xticklabels(['HSK 1', 'HSK 2', 'HSK 3'], fontsize=12)
ax.set_ylim(0, max(max(d_vals), max(g_vals)) * 1.2)
ax.spines['top'].set_visible(False); ax.spines['right'].set_visible(False)
ax.spines['left'].set_color('#ccc'); ax.spines['bottom'].set_color('#ccc')
ax.grid(axis='y', color='#eee', lw=0.5)

# ── Panel C: OOV Level Distribution (stacked) ─────────
ax = axes[2]
levels = [2,3,4,5,6,7]
# Nature color ramp for levels
level_colors = ['#E8F4F8','#C5E3ED','#A2D2E2','#7EA8BE','#5A8EAD','#3D6E8C']

for li, lv in enumerate(levels):
    d = [doubao[t][2].get(lv,0) for t in [1,2,3]]
    g = [gpt[t][2].get(lv,0) for t in [1,2,3]]
    bottom_offset = x - bar_w/2
    ax.bar(bottom_offset, d, bar_w, bottom=[sum([doubao[t][2].get(ll,0) for ll in levels[:li]]) for t in [1,2,3]],
           color=level_colors[li], edgecolor='white', lw=0.3, label=f'L{lv}' if li < 3 else None)
    ax.bar(x + bar_w/2, g, bar_w, bottom=[sum([gpt[t][2].get(ll,0) for ll in levels[:li]]) for t in [1,2,3]],
           color=level_colors[li], edgecolor='white', lw=0.3)

# Label: D=Doubao, G=GPT
for i in range(3):
    d_total = sum([doubao[i+1][2].get(lv,0) for lv in levels])
    g_total = sum([gpt[i+1][2].get(lv,0) for lv in levels])
    ax.text(i - bar_w/2, d_total + 2, 'D', ha='center', fontsize=9, color='#555', fontweight='bold')
    ax.text(i + bar_w/2, g_total + 2, 'G', ha='center', fontsize=9, color='#555', fontweight='bold')

ax.set_title('超纲词等级分布（堆叠）', fontsize=14, fontweight='bold', pad=10)
ax.set_xticks(x)
ax.set_xticklabels(['HSK 1', 'HSK 2', 'HSK 3'], fontsize=12)
ax.set_ylabel('超纲词总数', fontsize=12)
ax.spines['top'].set_visible(False); ax.spines['right'].set_visible(False)
ax.spines['left'].set_color('#ccc'); ax.spines['bottom'].set_color('#ccc')
ax.grid(axis='y', color='#eee', lw=0.5)

# ── Global ─────────────────────────────────────────────
handles, labs = axes[0].get_legend_handles_labels()
fig.legend(handles, labs, loc='upper center', ncol=2, fontsize=12, frameon=False, bbox_to_anchor=(0.5, 1.01))
fig.suptitle('豆包 vs ChatGPT — HSK 1-3 文本生成质量对比', fontsize=18, fontweight='bold', y=1.08)

fig.tight_layout(pad=3)
out = 'd:/OneDrive/Desktop/hsk-learning-platform/public/model-comparison'
plt.savefig(out + '.svg', format='svg', dpi=300, bbox_inches='tight', facecolor='white')
plt.savefig(out + '.png', format='png', dpi=300, bbox_inches='tight', facecolor='white')
print(f'Saved: {out}.svg / .png')
plt.close()
