import { useTimelineStore } from '@/stores/timelineStore'
import { ElMessage } from 'element-plus'

export function useShareProject() {
    const store = useTimelineStore()

    // 1. 复制分享码
    function copyShareCode() {
        try {
            // 获取压缩后的长字符串
            const shareStr = store.exportShareString()

            // 写入剪贴板
            navigator.clipboard.writeText(shareStr).then(() => {
                ElMessage.success('分享码已复制到剪贴板！可发给好友导入。')
            }).catch(err => {
                console.error('Copy failed', err)
                ElMessage.warning('复制失败，可能是浏览器权限限制')
            })
        } catch (e) {
            console.error(e)
            ElMessage.error('分享码生成失败: ' + e.message)
        }
    }

    // 2. 解析导入分享码
    function importFromCode(code) {
        if (!code) {
            ElMessage.warning('请输入分享码')
            return false
        }

        // 调用 Store 里的解压和合并逻辑
        const success = store.importShareString(code)

        if (success) {
            ElMessage.success('成功导入分享的方案！')
            return true
        } else {
            ElMessage.error('分享码格式错误或数据损坏')
            return false
        }
    }

    return {
        copyShareCode,
        importFromCode
    }
}