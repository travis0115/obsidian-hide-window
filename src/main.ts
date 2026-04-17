import { App, Plugin, PluginSettingTab, Setting, WorkspaceLeaf } from 'obsidian';

interface HideWindowSettings {
  hideOnAnyTabClose: boolean;
}

const DEFAULT_SETTINGS: HideWindowSettings = {
  hideOnAnyTabClose: true
};

export default class HideWindowPlugin extends Plugin {
  settings: HideWindowSettings;
  private tabCountBefore: number = 0;
  private activeLeafTypeBefore: string = '';
  private previousActiveLeaf: WorkspaceLeaf | null = null;
  private isInitialized: boolean = false;

  async onload() {
    await this.loadSettings();

    // 初始化时记录当前状态
    this.initializeState();

    // 监听标签页关闭事件
    this.registerEvent(
      this.app.workspace.on('layout-change', () => {
        this.handleLayoutChange();
      })
    );

    // 添加设置标签
    this.addSettingTab(new HideWindowSettingTab(this.app, this));

    console.log('Hide Window plugin loaded');
  }

  /**
   * 初始化时记录当前标签页状态
   */
  private initializeState(): void {
    const leaves = this.getTabLeaves();
    this.tabCountBefore = leaves.length;
    
    // @ts-ignore - activeLeaf is deprecated but still works
    const activeLeaf = this.app.workspace.activeLeaf;
    this.activeLeafTypeBefore = activeLeaf ? this.getLeafType(activeLeaf) : '';
    this.previousActiveLeaf = activeLeaf;
    this.isInitialized = true;
  }

  /**
   * 处理布局变化（标签页关闭时触发）
   */
  private handleLayoutChange(): void {
    if (!this.isInitialized) {
      this.initializeState();
      return;
    }

    const currentLeaves = this.getTabLeaves();
    const currentTabCount = currentLeaves.length;

    console.log('Tab count changed:', this.tabCountBefore, '->', currentTabCount);
    console.log('Active leaf type before:', this.activeLeafTypeBefore);

    // 只处理标签页数量减少的情况（关闭标签页）
    if (currentTabCount < this.tabCountBefore) {
      console.log('Tab closed, checking if should hide window...');
      // 只有当关闭前只有1个标签页时才可能触发隐藏
      if (this.tabCountBefore === 1) {
        this.handleTabClose();
      }
    } else if (this.tabCountBefore === 1 && currentTabCount === 1) {
      // 特殊情况：从 1 个变成 1 个，可能是关闭了最后一个标签页后 Obsidian 自动创建了新的 empty 标签页
      // 检查 activeLeaf 是否变化（对象不同，说明是新建的标签页）
      // @ts-ignore - activeLeaf is deprecated but still works
      const activeLeaf = this.app.workspace.activeLeaf;
      const currentLeafType = activeLeaf ? this.getLeafType(activeLeaf) : '';
      
      // 如果 activeLeaf 对象发生变化，说明关闭了旧标签页，创建了新的
      if (activeLeaf !== this.previousActiveLeaf) {
        console.log('Detected last tab close: leaf object changed');
        this.handleTabClose();
      }
    }

    // 更新状态
    this.tabCountBefore = currentTabCount;
    // @ts-ignore - activeLeaf is deprecated but still works
    const activeLeaf = this.app.workspace.activeLeaf;
    this.activeLeafTypeBefore = activeLeaf ? this.getLeafType(activeLeaf) : '';
    this.previousActiveLeaf = activeLeaf;
  }

  /**
   * 处理标签页关闭逻辑
   */
  private handleTabClose(): void {
    console.log('handleTabClose called, tabCountBefore:', this.tabCountBefore, 'activeLeafTypeBefore:', this.activeLeafTypeBefore);
      
    // 如果关闭前有1个标签页
    if (this.tabCountBefore === 1) {
      console.log('Last tab was closed. Option hideOnAnyTabClose:', this.settings.hideOnAnyTabClose);
        
      // 检查选项设置
      if (this.settings.hideOnAnyTabClose) {
        // 选项开启:无论什么类型的标签页都隐藏窗口
        console.log('Option enabled, hiding window for any tab type');
        this.hideWindow();
      } else {
        // 选项关闭:只有空标签页才隐藏窗口
        console.log('Option disabled, checking if last tab was empty...');
        if (this.activeLeafTypeBefore === 'empty') {
          console.log('Last tab was empty, hiding window');
          this.hideWindow();
        } else {
          console.log('Last tab had content, not hiding window');
        }
      }
    }
  }

  /**
   * 隐藏 Obsidian 窗口 (等同于 Cmd+H)
   */
  private hideWindow(): void {
    console.log('hideWindow() called');
    try {
      const electron = (window as any).require('electron');
      console.log('electron module:', electron ? 'loaded' : 'not loaded');
      
      if (electron && electron.remote) {
        console.log('electron.remote available');
        
        // 方法1: 使用 app.hide() - macOS 等同于 Cmd+H
        const app = electron.remote.app;
        if (app) {
          console.log('Calling app.hide()');
          app.hide();
          console.log('Window hidden via app.hide()');
          return;
        }
        
        // 方法2: 使用 BrowserWindow.getFocusedWindow()?.hide()
        const BrowserWindow = electron.remote.BrowserWindow;
        if (BrowserWindow) {
          const currentWindow = BrowserWindow.getFocusedWindow();
          if (currentWindow) {
            console.log('Calling BrowserWindow.getFocusedWindow().hide()');
            currentWindow.hide();
            console.log('Window hidden via BrowserWindow.getFocusedWindow().hide()');
            return;
          }
        }
        
        // 方法3: 使用 getCurrentWindow()
        const currentWindow = electron.remote.getCurrentWindow();
        if (currentWindow) {
          console.log('Calling getCurrentWindow().hide()');
          currentWindow.hide();
          console.log('Window hidden via getCurrentWindow().hide()');
        }
      } else {
        console.log('electron.remote not available');
      }
    } catch (error) {
      console.error('hideWindow error:', error);
    }
  }

  /**
   * 获取所有标签页的 Leaf
   */
  private getTabLeaves(): WorkspaceLeaf[] {
    const leaves: WorkspaceLeaf[] = [];
    
    // 尝试使用 iterateRootLeaves
    const workspace = this.app.workspace as any;
    
    // 方法1: 尝试 iterateRootLeaves
    if (workspace.iterateRootLeaves) {
      workspace.iterateRootLeaves((leaf: WorkspaceLeaf) => {
        leaves.push(leaf);
      });
    }
    // 方法2: 使用 floatingSplit 获取
    else if (workspace.floatingSplit) {
      const collectLeaves = (split: any) => {
        if (split.children) {
          split.children.forEach((child: any) => {
            if (child.type === 'leaf' && child.leaf) {
              leaves.push(child.leaf);
            } else if (child.children) {
              collectLeaves(child);
            }
          });
        }
      };
      collectLeaves(workspace.floatingSplit);
    }
    
    console.log('Total tab leaves:', leaves.length);
    return leaves;
  }

  /**
   * 获取 Leaf 的类型
   */
  private getLeafType(leaf: WorkspaceLeaf): string {
    const viewType = leaf.view ? leaf.view.getViewType() : 'empty';
    console.log('Leaf view type:', viewType);
    
    // 检查是否为空标签页
    if (viewType === 'empty') {
      return 'empty';
    }
    
    // 检查是否为 markdown 视图但没有文件
    if (viewType === 'markdown') {
      const file = (leaf.view as any).file;
      if (!file) {
        return 'empty';
      }
    }
    
    return 'content';
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}

class HideWindowSettingTab extends PluginSettingTab {
  plugin: HideWindowPlugin;

  constructor(app: App, plugin: HideWindowPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    // 插件说明
    const descEl = containerEl.createEl('p', {
      text: 'Automatically hide the obsidian window when closing last tag.'
    });
    descEl.style.marginBottom = '10px';
    

    new Setting(containerEl)
      .setName('Whether the tab is empty or not')
      .setDesc('')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.hideOnAnyTabClose)
        .onChange(async (value) => {
          this.plugin.settings.hideOnAnyTabClose = value;
          await this.plugin.saveSettings();
        })
      );
    
    // 添加详细说明
    const detailEl = containerEl.createEl('div');
    detailEl.style.marginTop = '10px';
    detailEl.style.marginBottom = '10px';
    detailEl.style.color = 'var(--text-muted)';
    
    detailEl.createEl('p', {
      text: 'Enabled: the window will be hidden when the last tab is closed. (whether the tab is empty or not)'
    });
    
    detailEl.createEl('p', {
      text: 'Disabled: the window will only hide when the last tab is closed and it is an empty tab.'
    });
    
    detailEl.createEl('p', {
      text: 'If you are accustomed to using only one tab, enabling this option will be more in line with the logic of use.'
    });

    const authorEl = containerEl.createEl('p', {
      text: 'Author: Travis (travis0115@163.com)'
    });
    authorEl.style.color = 'var(--text-muted)';
    authorEl.style.textAlign = 'right';
    authorEl.style.fontSize = 'var(--font-ui-smaller)';
  }
}
