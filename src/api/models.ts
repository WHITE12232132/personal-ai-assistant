
export async function fetchModels(
    baseUrl: string,
    apiKey: string
): Promise<string[]> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 对标样例：5 秒超时
    try {
        const url = baseUrl.trim().replace(/\/+$/, '') + '/models'; // 去尾斜杠，防 .../v1//models
        const response = await fetch(url, {
            method: 'GET',
            headers: { Authorization: `Bearer ${apiKey}` },
            signal: controller.signal,
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`); // 401 = key错，404 = 地址错……
        }

        // 解析规则（实测定型）：只认 data[].id 是字符串，别的字段一概不问
        const json: unknown = await response.json();
        const data = (json as { data?: unknown } | null)?.data;
        if (!Array.isArray(data)) {
            throw new Error('响应结构不对：没有 data 数组');
        }
        const ids = data
            .map((item) => (item as { id?: unknown } | null)?.id)
            .filter((id): id is string => typeof id === 'string');
        if (ids.length === 0) {
            throw new Error('模型列表为空');
        }
        return ids;
    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error('拉取超时（5 秒无响应）'); // 机器话换人话，UI 直接显示
        }
        throw error; // 其余错误原样抛（message 本身就是原因）
    } finally {
        clearTimeout(timeoutId); // 无论成败都拆定时器（对标样例两路各 clear，finally 更干净）
    }
}