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

    // 检测是否有标签页被关闭
    if (currentTabCount < this.tabCountBefore) {
      // 有关闭操作发生
      this.handleTabClose();
    }

    // 更新状态
    this.tabCountBefore = currentTabCount;
    const activeLeaf = this.app.workspace.activeLeaf;
    this.activeLeafTypeBefore = activeLeaf ? this.getLeafType(activeLeaf) : '';
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
   * 隐藏 Obsidian 窗口
   */
  private hideWindow(): void {
    const electron = (window as any).require('electron');
    if (electron && electron.remote) {
      const currentWindow = electron.remote.getCurrentWindow();
      if (currentWindow) {
        currentWindow.hide();
        console.log('Window hidden by Hide Window plugin');
      }
    }
  }

  /**
   * 获取所有标签页的 Leaf
   */
  private getTabLeaves(): WorkspaceLeaf[] {
    return this.app.workspace.getLeavesOfType('markdown');
  }

  /**
   * 获取 Leaf 的类型
   */
  private getLeafType(leaf: WorkspaceLeaf): string {
    // 检查是否为空标签页
    if (!leaf.view || leaf.view.getViewType() === 'empty') {
      return 'empty';
    }
    
    // 检查是否为 markdown 视图但没有文件
    if (leaf.view.getViewType() === 'markdown') {
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
