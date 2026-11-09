from pathlib import Path
import shutil
root=Path(__file__).resolve().parents[1]
shutil.copyfile(root/'results/primary_figure.png',root/'web/assets/primary_figure.png')
print('Synced generated primary figure into the static prototype.')
