import { BrowserWindow, screen, Rectangle } from 'electron';
import fs from 'fs';
import path from 'path';

export interface WindowState {
  x?: number;
  y?: number;
  width: number;
  height: number;
}

export class WindowStateManager {
  private stateFilePath: string;
  private state: WindowState;

  constructor(storageDir: string) {
    this.stateFilePath = path.join(storageDir, 'window-state.json');
    this.state = this.loadState();
  }

  private loadState(): WindowState {
    const defaultState: WindowState = {
      width: 920,
      height: 720,
    };

    if (fs.existsSync(this.stateFilePath)) {
      try {
        const raw = fs.readFileSync(this.stateFilePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (typeof parsed.width === 'number' && typeof parsed.height === 'number') {
          return {
            x: parsed.x,
            y: parsed.y,
            width: Math.max(780, parsed.width),
            height: Math.max(500, parsed.height),
          };
        }
      } catch {
        // Fallback to default
      }
    }

    return defaultState;
  }

  public saveState(win: BrowserWindow): void {
    if (!win.isDestroyed()) {
      const bounds = win.getBounds();
      this.state = {
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
      };

      try {
        fs.writeFileSync(this.stateFilePath, JSON.stringify(this.state, null, 2), 'utf-8');
      } catch (err) {
        console.error('Failed to save window state:', err);
      }
    }
  }

  public getClampedBounds(): WindowState {
    const displays = screen.getAllDisplays();
    const primary = screen.getPrimaryDisplay();
    const primaryWorkArea = primary.workArea;

    // Default clamped dimensions
    let width = this.state.width || 920;
    let height = this.state.height || 720;

    // Ensure within reasonable bounds
    width = Math.min(width, primaryWorkArea.width);
    height = Math.min(height, primaryWorkArea.height);

    if (this.state.x === undefined || this.state.y === undefined) {
      // Center on primary display
      return {
        x: Math.round(primaryWorkArea.x + (primaryWorkArea.width - width) / 2),
        y: Math.round(primaryWorkArea.y + (primaryWorkArea.height - height) / 2),
        width,
        height,
      };
    }

    // Check if saved position is visible on ANY active display
    const windowRect: Rectangle = {
      x: this.state.x,
      y: this.state.y,
      width,
      height,
    };

    let matchedDisplay = displays.find(d => {
      const wa = d.workArea;
      // At least 100x100 visible area on this display
      const overlapX = Math.max(0, Math.min(windowRect.x + windowRect.width, wa.x + wa.width) - Math.max(windowRect.x, wa.x));
      const overlapY = Math.max(0, Math.min(windowRect.y + windowRect.height, wa.y + wa.height) - Math.max(windowRect.y, wa.y));
      return overlapX >= 100 && overlapY >= 100;
    });

    if (matchedDisplay) {
      // Clamp inside matched display workArea
      const wa = matchedDisplay.workArea;
      const x = Math.max(wa.x, Math.min(windowRect.x, wa.x + wa.width - width));
      const y = Math.max(wa.y, Math.min(windowRect.y, wa.y + wa.height - height));
      return { x, y, width, height };
    }

    // Saved display was disconnected or unavailable: clamp onto primary display
    const x = Math.round(primaryWorkArea.x + (primaryWorkArea.width - width) / 2);
    const y = Math.round(primaryWorkArea.y + (primaryWorkArea.height - height) / 2);
    return { x, y, width, height };
  }

  public registerDisplayListeners(win: BrowserWindow): void {
    const revalidate = () => {
      if (win.isDestroyed()) return;
      const currentBounds = win.getBounds();
      this.state.x = currentBounds.x;
      this.state.y = currentBounds.y;
      this.state.width = currentBounds.width;
      this.state.height = currentBounds.height;

      const clamped = this.getClampedBounds();
      win.setBounds({
        x: clamped.x!,
        y: clamped.y!,
        width: clamped.width,
        height: clamped.height,
      });
    };

    screen.on('display-removed', revalidate);
    screen.on('display-metrics-changed', revalidate);
  }
}
