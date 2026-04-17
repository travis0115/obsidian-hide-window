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
    
    const activeLeaf = this.app.workspace.activeLeaf;
    this.activeLeafTypeBefore = activeLeaf ? this.getLeafType(activeLeaf) : '';
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

    // 检测是否有标签页被关闭
    if (currentTabCount < this.tabCountBefore) {
      // 标签页数量减少，有关闭操作发生
      this.handleTabClose();
    } else if (this.tabCountBefore === 1 && currentTabCount === 1) {
      // 特殊情况：从 1 个变成 1 个，可能是关闭了最后一个标签页后 Obsidian 自动创建了新的 empty 标签页
      // 检查 activeLeaf 是否变化
      const activeLeaf = this.app.workspace.activeLeaf;
      const currentLeafType = activeLeaf ? this.getLeafType(activeLeaf) : '';
      
      if (currentLeafType !== this.activeLeafTypeBefore || activeLeaf !== this.previousActiveLeaf) {
        console.log('Detected last tab close with auto-created new tab');
        this.handleTabClose();
      }
    }

    // 更新状态
    this.tabCountBefore = currentTabCount;
    const activeLeaf = this.app.workspace.activeLeaf;
    this.activeLeafTypeBefore = activeLeaf ? this.getLeafType(activeLeaf) : '';
    this.previousActiveLeaf = activeLeaf;
  }

  /**
   * 处理标签页关闭逻辑
   */
  private handleTabClose(): void {
    // 如果关闭前有1个标签页，现在变为0个
    if (this.tabCountBefore === 1 && this.getTabLeaves().length === 0) {
      // 检查选项设置
      if (this.settings.hideOnAnyTabClose) {
        // 选项开启：无论什么类型的标签页都隐藏窗口
        this.hideWindow();
      } else {
        // 选项关闭：只有空标签页才隐藏窗口
        if (this.activeLeafTypeBefore === 'empty') {
          this.hideWindow();
        }
      }
    }
  }

  /**
   * 隐藏 Obsidian 窗口 (等同于 Cmd+H)
   */
  private hideWindow(): void {
    const electron = (window as any).require('electron');
    if (electron && electron.remote) {
      const app = electron.remote.app;
      if (app) {
        app.hide();
        console.log('Window hidden by Hide Window plugin (app.hide)');
      }
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

    new Setting(containerEl)
      .setName('Whether the tab is empty or not')
      .setDesc(
        'When enabled, the window will be hidden when the last tab is closed. (whether the tab is empty or not)\n' +
        'When disabled, the window will only be hidden when the last empty tab is closed.\n' +
        'If you are accustomed to using only one tab, enabling this option will be more in line with the logic of use.'
      )
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.hideOnAnyTabClose)
        .onChange(async (value) => {
          this.plugin.settings.hideOnAnyTabClose = value;
          await this.plugin.saveSettings();
        })
      );
  }
}
