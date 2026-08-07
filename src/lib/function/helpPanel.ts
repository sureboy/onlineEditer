// helpPanel.ts
import { StateEffect, StateField } from "@codemirror/state";
import { showPanel, EditorView, keymap } from "@codemirror/view";
import type {   Panel } from "@codemirror/view";
// 1. 定义用于切换面板状态的效果 (Effect)
const toggleHelpEffect = StateEffect.define<boolean>();

// 2. 定义状态字段 (StateField) 来管理面板的显示/隐藏
const helpPanelStateField = StateField.define<boolean>({
    create: () => true,
    update(value, transaction) {
        for (let effect of transaction.effects) {
            if (effect.is(toggleHelpEffect)) {
                value = effect.value;
            }
        }
        return value;
    },
    // 当状态为 true 时，通过 showPanel 提供面板
    provide: (field) => showPanel.from(field, (isVisible) => 
        isVisible ? createHelpPanel : null
    ),
});

// 3. 创建面板的 DOM 元素
function createHelpPanel(view: EditorView): Panel {
    let dom = document.createElement("div");
    dom.className = "cm-menu-panel";

    // 创建下拉列表
    let select = document.createElement("select");
    let options = ["基础语法", "快捷键", "常见问题"];
    options.forEach((text) => {
        let opt = document.createElement("option");
        opt.textContent = text;
        select.appendChild(opt);
    });

    // 创建一个用于显示帮助内容的区域
    let content = document.createElement("span");
    content.textContent = "当前帮助内容：基础语法";

    // 监听下拉变化
    select.addEventListener("change", () => {
        content.textContent = `当前帮助内容：${select.value}`;
    });

    dom.appendChild(select);
    dom.appendChild(content);
    return { top: true, dom };
}

// 4. 定义键盘快捷键 (F1)
const helpKeymap = keymap.of([
    {
        key: "F1",
        run(view: EditorView) {
            const isVisible = view.state.field(helpPanelStateField);
            view.dispatch({
                effects: toggleHelpEffect.of(!isVisible),
            });
            return true;
        },
    },
]);

 
const helpTheme = EditorView.baseTheme({
  ".cm-menu-panel": {
    padding: "5px 10px",
    backgroundColor: "#525353",
  },
  ".cm-menu-panel span": {
    color:"#fff",
    fontFamily: "monospace"
  }
})
// 6. 导出最终的扩展函数
export function helpPanel() {
    return [helpPanelStateField, helpKeymap, helpTheme];
}