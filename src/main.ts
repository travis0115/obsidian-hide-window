import { App, FileView, Plugin, PluginSettingTab, Setting, WorkspaceLeaf } from 'obsidian';

interface HideWindowSettings {
    hideOnAnyTabClose: boolean;
}

const DEFAULT_SETTINGS: HideWindowSettings = {
    hideOnAnyTabClose: true
};

interface ElectronWindowLike {
    hide(): void;
}

interface ElectronRemoteLike {
    app?: { hide(): void };
    BrowserWindow?: { getFocusedWindow(): ElectronWindowLike | null };
    getCurrentWindow?(): ElectronWindowLike | null;
}

interface ElectronModuleLike {
    remote?: ElectronRemoteLike;
}

type RequireFn = (id: string) => unknown;

export default class HideWindowPlugin extends Plugin {
    settings: HideWindowSettings;
    private tabCountBefore = 0;
    private activeLeafTypeBefore = '';
    private previousActiveLeaf: WorkspaceLeaf | null = null;
    private isInitialized = false;

    async onload() {
        await this.loadSettings();

        // 初始化时记录当前状态
        this.initializeState();

        // 监听布局变化（包含标签页关闭）
        this.registerEvent(
            this.app.workspace.on('layout-change', () => {
                this.handleLayoutChange();
            })
        );

        // 添加设置标签
        this.addSettingTab(new HideWindowSettingTab(this.app, this));
    }

    /**
     * 初始化时记录当前标签页状态
     */
    private initializeState(): void {
        const leaves = this.getTabLeaves();
        this.tabCountBefore = leaves.length;

        const activeLeaf = this.app.workspace.getMostRecentLeaf();
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

        // 只处理标签页数量减少的情况(关闭标签页)
        if (currentTabCount < this.tabCountBefore) {
            // 只有当关闭前只有1个标签页时才可能触发隐藏
            if (this.tabCountBefore === 1) {
                this.handleTabClose();
            }
        } else if (this.tabCountBefore === 1 && currentTabCount === 1) {
            // 特殊情况:从 1 个变成 1 个,可能是关闭了最后一个标签页后 Obsidian 自动创建了新的 empty 标签页
            const activeLeaf = this.app.workspace.getMostRecentLeaf();

            // 关键修复:如果 previousActiveLeaf 仍存在于主编辑区标签页中,
            // 说明原标签页并未被关闭(例如用户只是点击了左侧边栏的搜索/标签按钮,
            // 导致全局 activeLeaf 切到侧边栏 leaf,而主编辑区标签页原封不动),
            // 此时不应触发隐藏。
            const prevStillInRoot = this.previousActiveLeaf !== null
                && currentLeaves.indexOf(this.previousActiveLeaf) !== -1;

            // 仅当原主区域标签页已不在 && activeLeaf 对象变化时,才认为是"关闭最后一个标签+自动新建 empty"
            if (!prevStillInRoot && activeLeaf !== this.previousActiveLeaf) {
                this.handleTabClose();
            }
        }

        // 更新状态
        this.tabCountBefore = currentTabCount;
        const activeLeaf = this.app.workspace.getMostRecentLeaf();
        // 关键修复:仅当 activeLeaf 属于主编辑区(根区域)时才更新 previousActiveLeaf 与 activeLeafTypeBefore,
        // 避免点击侧边栏按钮(如搜索/标签)导致状态被侧边栏 leaf 污染。
        // 尤其对 activeLeafTypeBefore: 若被侧边栏 leaf 污染为 'content',
        // 在 hideOnAnyTabClose=false 的分支下会导致"关闭最后一个 empty 标签"时误判不隐藏,
        // 出现"需要关闭两次才隐藏"的缺陷。
        if (activeLeaf && currentLeaves.indexOf(activeLeaf) !== -1) {
            this.previousActiveLeaf = activeLeaf;
            this.activeLeafTypeBefore = this.getLeafType(activeLeaf);
        }
    }

    /**
     * 处理标签页关闭逻辑
     */
    private handleTabClose(): void {
        // 如果关闭前有1个标签页
        if (this.tabCountBefore === 1) {
            // 检查选项设置
            if (this.settings.hideOnAnyTabClose) {
                // 选项开启:无论什么类型的标签页都隐藏窗口
                this.hideWindow();
            } else {
                // 选项关闭:只有空标签页才隐藏窗口
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
        try {
            const requireFn = (window as unknown as { require?: RequireFn }).require;
            if (typeof requireFn !== 'function') {
                return;
            }

            const electron = requireFn('electron') as ElectronModuleLike | undefined;
            const remote = electron?.remote;
            if (!remote) {
                return;
            }

            // 方法1: 使用 app.hide() - macOS 等同于 Cmd+H
            if (remote.app) {
                remote.app.hide();
                return;
            }

            // 方法2: 使用 BrowserWindow.getFocusedWindow()?.hide()
            const focused = remote.BrowserWindow?.getFocusedWindow();
            if (focused) {
                focused.hide();
                return;
            }

            // 方法3: 使用 getCurrentWindow()
            const currentWindow = remote.getCurrentWindow?.();
            if (currentWindow) {
                currentWindow.hide();
            }
        } catch (error) {
            console.error('Hide Window: Failed to hide window', error);
        }
    }

    /**
     * 获取所有主编辑区标签页的 Leaf
     */
    private getTabLeaves(): WorkspaceLeaf[] {
        const leaves: WorkspaceLeaf[] = [];
        this.app.workspace.iterateRootLeaves((leaf) => {
            leaves.push(leaf);
        });
        return leaves;
    }

    /**
     * 获取 Leaf 的类型
     */
    private getLeafType(leaf: WorkspaceLeaf): string {
        const viewType = leaf.view ? leaf.view.getViewType() : 'empty';

        // 空标签页
        if (viewType === 'empty') {
            return 'empty';
        }

        // 文件视图但没有绑定文件,同样视为空
        if (leaf.view instanceof FileView && !leaf.view.file) {
            return 'empty';
        }

        return 'content';
    }

    async loadSettings() {
        const data = (await this.loadData()) as Partial<HideWindowSettings> | null;
        this.settings = Object.assign({}, DEFAULT_SETTINGS, data);
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
            text: 'Automatically hide the Obsidian window when closing the last tab.'
        });
        descEl.addClass('hide-window-setting-desc');

        const setting = new Setting(containerEl)
            .setName('Whether the tab is empty or not')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.hideOnAnyTabClose)
                .onChange(async (value) => {
                    this.plugin.settings.hideOnAnyTabClose = value;
                    await this.plugin.saveSettings();
                })
            );

        const settingDescEl = setting.descEl;
        settingDescEl.empty();
        settingDescEl.createEl('p', { text: 'Enabled: the window will be hidden regardless of whether it is empty.' });
        settingDescEl.createEl('p', { text: 'Disabled: the window will be hidden only when the last tab is empty.' });
        const hintEl = settingDescEl.createEl('p', {
            text: 'If you are accustomed to using only one tab, enabling this option will be more in line with the logic of use.'
        });
        hintEl.addClass('hide-window-setting-hint');

        const authorEl = containerEl.createEl('p', {
            text: 'Travis (travis0115@163.com)'
        });
        authorEl.addClass('hide-window-setting-author');
    }
}
