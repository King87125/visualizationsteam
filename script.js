let gameData = [];

// 从 filtered_games.json 加载数据
fetch('updated_games_data.json') 
    .then(response => response.json()) 
    .then(data => {
        gameData = data.map(game => ({

            name: game.Title,
            tags: game["Popular Tags"] || [],
            achievements:game["achievement"]||[],
            positiveReviews:game["Positive Reviews"],
            positiveRate:game["Rating"],
            onlinePlayers: [
                game["Online Players Last Month"] || 0,
                game["Online Players Two Months Ago"] || 0,
                game["Online Players Three Months Ago"] || 0
            ],
            details: {
                "Title": game.Title,
                "Original Price": game["Original Price"] || "N/A",
                "Discounted Price": game["Discounted Price"] || "N/A",
                "Release Date": game["Release Date"] || "Unknown",
                "Developer": game.Developer || "Unknown",
                "Publisher": game.Publisher || "Unknown",
                "Supported Languages": game["Supported Languages"] || "Unknown",
                "Game Description": game["Game Description"] || "No description available.",
                "Recent Reviews": game["Recent Reviews Summary"] || "No recent reviews",
                "Link": game.Link || "#"
            }
        }));

        displayResults();
    })
    .catch(err => console.error("加载游戏数据失败:", err));

const colors = ["#FF6347", "#6A5ACD", "#FFD700", "#40E0D0", "#FF69B4", "#7B68EE", "#32CD32", "#FFA07A"];
let tagData = [];
let bubbleData = [];
let selectedTags = [];
let isTooltipFixed = false;
let currentTooltipParams = null;
const bubbleChart = echarts.init(document.getElementById("bubbleContainer"));
const scatterChart = echarts.init(document.getElementById("scatterChart"));
const lineChart = echarts.init(document.getElementById("lineChart"));
const barChart = echarts.init(document.getElementById("barChart"));

// 动态加载标签数据
fetch('top40_tag_counts.json')
    .then(response => response.json())
    .then(data => {
        tagData = data.map((item, index) => ({
            name: item[0],
            value: item[1],
            color: colors[index % colors.length]
        }));
        initializeBubbleChart();
    })
    .catch(err => console.error("加载标签数据失败:", err));

// 气泡初始化
function initializeBubbleChart() {
    bubbleData = generateNonOverlappingData();
    renderBubbleChart();
    setInterval(moveBubbles, 100); // 气泡随机移动的间隔
}

// 防止气泡重叠
function generateNonOverlappingData() {
    const positions = [];
    return tagData.map(tag => {
        let x, y, overlap;
        do {
            x = Math.random() * 90 + 5;
            y = Math.random() * 90 + 5;
            overlap = positions.some(pos => Math.hypot(pos.x - x, pos.y - y) < 10);
        } while (overlap);
        positions.push({ x, y });
        return { x, y, value: tag.value, name: tag.name, color: tag.color };
    });
}

function renderBubbleChart() {
    bubbleChart.setOption({
        title: { text: "动态标签筛选", left: "center" },
        xAxis: { show: false, min: 0, max: 100 },
        yAxis: { show: false, min: 0, max: 100 },
        animationDuration: 1000,
        animationEasing: 'elasticOut',
        series: [{
            name: "标签",
            type: "scatter",
            symbolSize: data => Math.sqrt(data[2]) * 8,
            data: bubbleData.map(tag => [tag.x, tag.y, tag.value, tag.name, tag.color]),
            label: {
                show: true,
                formatter: "{@[3]}",
                position: "inside",
                color: "#000",
                fontWeight: "bold"
            },
            itemStyle: { color: params => params.data[4] },
            emphasis: {
                itemStyle: {
                    shadowBlur: 10,
                    shadowColor: 'rgba(0,0,0,0.3)',
                    borderColor: '#fff',
                    borderWidth: 2
                }
            }
        }]
    });

    bubbleChart.on("click", params => handleBubbleClick(params));
}

// 气泡随机移动，防止重叠
function moveBubbles() {
    const speed = 1.5; // 气泡的最大移动速度
    const minDist = 10; // 防止碰撞的最小距离

    bubbleData.forEach((bubble, index) => {
        let dx = (Math.random() - 0.5) * speed;
        let dy = (Math.random() - 0.5) * speed;

        // 检查是否与其他气泡碰撞
        bubbleData.forEach((otherBubble, otherIndex) => {
            if (index !== otherIndex) {
                const dist = Math.hypot(bubble.x - otherBubble.x, bubble.y - otherBubble.y);
                if (dist < minDist) {
                    // 调整气泡位置，避免重叠
                    const angle = Math.atan2(bubble.y - otherBubble.y, bubble.x - otherBubble.x);
                    dx += Math.cos(angle) * 0.5; // 依据碰撞角度偏移
                    dy += Math.sin(angle) * 0.5;
                }
            }
        });

        // 更新气泡位置
        bubble.x += dx;
        bubble.y += dy;

        // 确保气泡在边界内
        bubble.x = Math.min(95, Math.max(5, bubble.x));
        bubble.y = Math.min(95, Math.max(5, bubble.y));
    });

    renderBubbleChart();
}


function handleBubbleClick(params) {
    const tagName = params.data[3];
    if (selectedTags.includes(tagName)) {
        selectedTags = selectedTags.filter(tag => tag !== tagName);
    } else {
        selectedTags.push(tagName);
    }
    displayResults();
    // renderSelectedTags();
}

function displayResults() {
    const filteredGames = gameData.filter(game => selectedTags.every(tag => game.tags.includes(tag)));

    renderSelectedTags();

    document.getElementById("gameResults").innerHTML = selectedTags.length
        ? `已选择标签: ${selectedTags.join(", ")}<br>符合游戏: ${filteredGames.map(g => g.name).join(", ") || "无"}`
        : "请选择标签查看游戏列表";

    updateScatterChart(filteredGames);
    updateLineChart(filteredGames);
    updateBarChart(filteredGames);
    // 新增：生成并显示游戏排名
    generateGameRanking(filteredGames); 
}
function updateScatterChart(filteredGames) {
    // 按游戏名称的首字母排序（可选，根据需要）
    const sortedGames = filteredGames.sort((a, b) => a.name.localeCompare(b.name));

    scatterChart.setOption({
        title: { 
            text: "游戏好评数与好评率", 
            left: "center",
            textStyle: { 
                fontSize: 20 // 增加标题字体大小
            }
        },
        tooltip: {
            trigger: "item",
            alwaysShowContent: false, // 禁用默认 Tooltip 自动显示
            enterable: true, // 允许鼠标与 Tooltip 内容交互
            appendToBody: true, // 将 Tooltip 渲染到 body，确保鼠标可交互
            formatter: params => {
                const game = sortedGames.find(g => g.name === params.name);
                if (game && game.details) {
                    return `
                        <div style="text-align: left; font-size: 12px;">
                            <strong>${game.details.Title}</strong><br>
                            <strong>价格:</strong> ${game.details["Original Price"]} (${game.details["Discounted Price"]})<br>
                            <strong>发布日期:</strong> ${game.details["Release Date"]}<br>
                            <strong>开发商:</strong> ${game.details.Developer}<br>
                            <strong>评价:</strong> ${game.details["Recent Reviews"]}<br>
                            <a href="${game.details.Link}" target="_blank" style="color: #6A5ACD;">查看游戏详情</a>
                        </div>
                    `;
                }
                return '';
            },
            show: !isTooltipFixed // 当提示框固定时，不自动显示
        },
        grid: {
            left: "15%",   // 增加左侧空间
            right: "10%",  // 增加右侧空间
            top: "15%",    // 增加顶部空间
            bottom: "25%"  // 增加底部空间以适应更大的字体和标签
        },
        xAxis: { 
            type: "category",
            data: sortedGames.map(g => g.name), // 游戏名称
            axisLabel: { 
                rotate: 45, // 旋转标签，防止重叠
                fontSize: 10, // 调整X轴标签字体大小
                interval: 0, // 确保所有标签都显示
                formatter: function(value) {
                    // 如果游戏名称过长，可以进行换行或截断
                    return value.length > 10 ? value.slice(0, 10) + '...' : value;
                }
            }, 
            axisTick: { alignWithLabel: true },
            axisLine: {
                lineStyle: {
                    color: '#333' // X轴线颜色
                }
            }
        },
        yAxis: {
            name: "好评率",
            type: "value",
            min: 0,
            max: 10,
            nameTextStyle: { 
                fontSize: 14 // 增加Y轴名称字体大小
            },
            axisLabel: {
                fontSize: 12 // 增加Y轴标签字体大小
            },
            axisLine: {
                lineStyle: {
                    color: '#333' // Y轴线颜色
                }
            },
            splitLine: {
                lineStyle: {
                    type: 'dashed' // 分割线样式
                }
            }
        },
        dataZoom: [
            {
                type: 'slider', // 滑块缩放
                show: true,
                start: 0,
                end: (20 / sortedGames.length) * 100, // 初始显示比例，显示前20个
                handleSize: '100%', // 增加滑块手柄大小
                height: 20, // 增加滑块高度
                bottom: 10,
                backgroundColor: '#f0f0f0',
                fillerColor: '#6A5ACD',
                borderColor: '#ddd'
            },
            {
                type: 'inside', // 鼠标滚轮缩放
                start: 0,
                end: (20 / sortedGames.length) * 100
            }
        ],
        animationDuration: 1500,
        animationEasing: 'cubicOut',
        series: [{
            type: "scatter",
            name: "游戏数据",
            data: sortedGames.map(g => [g.name, g.positiveRate]),
            symbolSize: data => {
                const game = sortedGames.find(g => g.name === data[0]);
                return game && game.positiveReviews ? Math.sqrt(game.positiveReviews) / 10 : 5;
            }, // 散点大小根据好评数调整
            itemStyle: { 
                color: new echarts.graphic.RadialGradient(0.4, 0.3, 1, [
                    { offset: 0, color: '#FF8C00' },
                    { offset: 1, color: '#FFD700' }
                ])
            },
            emphasis: {
                itemStyle: {
                    borderColor: '#000',
                    borderWidth: 1,
                    shadowBlur: 8,
                    shadowColor: 'rgba(0,0,0,0.2)'
                }
            }
        }]
    });

    // 添加点击事件监听器
    scatterChart.off('click'); // 确保无重复事件绑定
    scatterChart.on('click', function (params) {
        if (params.componentType === 'series') {
            const index = params.dataIndex;
            const game = sortedGames[index];
            if (game && game.name) {
                // 使用 encodeURIComponent 处理特殊字符
                const encodedTitle = encodeURIComponent(game.name);
                window.location.href = `game_details.html?title=${encodedTitle}`;
            }
        }
    });

    // 鼠标移动事件：当提示框固定时，阻止默认的 Tooltip 显示
    scatterChart.off('mouseover');
    scatterChart.on('mouseover', function(params) {
        if (!isTooltipFixed) {
            scatterChart.dispatchAction({
                type: 'showTip',
                seriesIndex: params.seriesIndex,
                dataIndex: params.dataIndex
            });
        }
    });

    scatterChart.off('mouseout');
    scatterChart.on('mouseout', function() {
        if (!isTooltipFixed) {
            scatterChart.dispatchAction({
                type: 'hideTip'
            });
        }
    });
}

function renderSelectedTags() {
    const container = document.getElementById("selectedTagsList");
    container.innerHTML = "";
    selectedTags.forEach(tag => {
        const tagElement = document.createElement("div");
        tagElement.innerHTML = `
            <span>${tag}</span>
            <button onclick="removeTag('${tag}')">x</button>
        `;
        container.appendChild(tagElement);
    });
}

function removeTag(tag) {
    selectedTags = selectedTags.filter(t => t !== tag);
    displayResults();
    alert(`已删除标签: ${tag}`);
}


let searchMode = 'tag'; // 初始模式为标签搜索

// 设置搜索模式
function setSearchMode(mode) {
    searchMode = mode;

    // 切换按钮的高亮状态
    document.getElementById('tagSearchBtn').classList.toggle('active', mode === 'tag');
    document.getElementById('gameSearchBtn').classList.toggle('active', mode === 'game');

    // 切换输入框的占位符
    const searchInput = document.getElementById('searchInput');
    searchInput.placeholder = mode === 'tag' 
        ? "输入标签名称进行搜索" 
        : "输入游戏名称进行搜索";
}

// 执行搜索，根据模式调用不同的函数
function executeSearch() {
    const searchInput = document.getElementById('searchInput').value.trim();

    if (!searchInput) {
        alert("请输入有效的搜索内容！");
        return;
    }

    if (searchMode === 'tag') {
        searchTag(searchInput);
    } else if (searchMode === 'game') {
        searchGame(searchInput);
    }
}

// 标签搜索功能（保持不变）
function searchTag(tagName) {
    const matchedTag = tagData.find(tag => tag.name.toLowerCase().includes(tagName.toLowerCase()));

    if (matchedTag) {
        if (!selectedTags.includes(matchedTag.name)) {
            selectedTags.push(matchedTag.name);
        }
        displayResults();
        alert(`已选中标签: ${matchedTag.name}`);
    } else {
        alert("未找到匹配的标签，请检查输入是否正确！");
    }
}


// }
function searchGame(inputValue) {
    const keyword = inputValue.trim().toLowerCase(); // 用户输入的小写关键词

    if (!keyword) {
        alert("请输入有效的游戏名称！");
        return;
    }

    // 模糊搜索：匹配所有包含关键词的游戏
    const matchedGames = gameData.filter(game => 
        game.name.toLowerCase().includes(keyword)
    );

    if (matchedGames.length === 0) {
        alert("未找到匹配的游戏，请检查输入内容！");
    } else if (matchedGames.length === 1) {
        // 如果只有一个匹配结果，直接跳转
        const matchedGame = matchedGames[0];
        window.location.href = `game_details.html?title=${encodeURIComponent(matchedGame.details.Title)}`;
    } else {
        // 如果有多个匹配结果，展示选择列表
        let gameOptions = "找到多个匹配的游戏，请选择你要找的游戏序号：\n";
        matchedGames.forEach((game, index) => {
            gameOptions += `${index + 1}. ${game.name}\n`;
        });

        const choice = prompt(gameOptions + "\n请输入对应的序号以查看详情：");

        const selectedIndex = parseInt(choice) - 1;
        if (!isNaN(selectedIndex) && matchedGames[selectedIndex]) {
            const selectedGame = matchedGames[selectedIndex];
            window.location.href = `game_details.html?title=${encodeURIComponent(selectedGame.details.Title)}`;
        } else {
            alert("无效选择，请重新搜索！");
        }
    }
}

document.getElementById("tagSearchInput").addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
        searchTag();
    }
    
});


// }

function updateLineChart(games) {
    // 原有的三个月
    const months = ["10月", "11月", "12月"];
    
    // 计算每个月的在线人数总和
    const totals = months.map((_, i) => games.reduce((sum, g) => sum + (g.onlinePlayers[i] || 0), 0));
    
    // 预测1月份的在线人数
    // 方法：计算每个月的增长率，并基于平均增长率预测1月
    if (totals.length >= 2) { // 确保有足够的数据进行预测
        // 计算每个月的增长量
        const growths = [];
        for (let i = 1; i < totals.length; i++) {
            growths.push(totals[i] - totals[i - 1]);
        }
        
        // 计算平均增长量
        const averageGrowth = growths.reduce((sum, growth) => sum + growth, 0) / growths.length;
        
        // 预测1月份的在线人数
        const predictedJanuary = Math.round(totals[totals.length - 1] + averageGrowth);
        
        // 添加1月份到月份数组和总数数组
        months.push("1月"); // 添加1月份
        totals.push(predictedJanuary); // 添加预测的1月份在线人数
    } else {
        console.warn("数据不足以进行预测。需要至少两个月的数据。");
        // 如果数据不足，可以选择不进行预测或使用其他方法
        // 这里选择不添加1月份的数据
    }
    
    // 更新图表配置
    lineChart.setOption({
        title: { text: "该类别每月在线人数总和", left: "center" },
        grid: {
            left: "19%",   // 增加左侧空间
            top: "15%",
            bottom: "15%"
        },
        xAxis: { type: "category", data: months },
        yAxis: { name: "在线人数", type: "value" },
        animationDuration: 1500,
        animationEasing: 'cubicOut',
        series: [{
            type: "line",
            smooth: true,
            data: totals,
            lineStyle: {
                width: 3,
                color: '#6A5ACD'
            },
            areaStyle: {
                color: new echarts.graphic.LinearGradient(0,0,0,1,[
                    {offset: 0, color: 'rgba(106,90,205,0.5)'},
                    {offset: 1, color: 'rgba(106,90,205,0.1)'}
                ])
            },
            itemStyle: {
                color: '#6A5ACD'
            }
        }]
    });
}

function updateBarChart(games) {
    // 限制显示的游戏数量，例如前20个
    const initialDisplayCount = 20;
    // 按游戏名称的首字母排序
    const sortedGames = games.sort((a, b) => a.name.localeCompare(b.name));

    const gameNames = sortedGames.map(game => {
        // 截断游戏名称，如果超过12个字符，则截断并添加省略号
        return game.name.length > 12 ? game.name.slice(0, 12) + '...' : game.name;
    });

    const achievements = sortedGames.map(game => game.achievements || 0);

    console.log(sortedGames.map(g => g.achievements));
    console.log(achievements);

    const option = {
        title: { 
            text: "不同游戏的成就数量", 
            left: "center",
            textStyle: { 
                fontSize: 20 // 增加标题字体大小
            }
        },
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'shadow'
            },
            textStyle: {
                fontSize: 12 // 调整工具提示字体大小
            }
        },
        grid: {
            left: "15%",   // 增加左侧空间
            right: "10%",  // 增加右侧空间
            top: "20%",    // 增加顶部空间
            bottom: "25%"  // 增加底部空间以适应更大的字体和标签
        },
        xAxis: { 
            type: "category",
            data: gameNames, // 显示截断后的游戏名称
            axisLabel: { 
                rotate: 45, // 旋转标签，防止重叠
                fontSize: 10, // 调整X轴标签字体大小
                interval: 0, // 确保所有标签都显示
                formatter: function(value) {
                    // 如果游戏名称过长，可以进行换行或截断
                    return value.length > 10 ? value.slice(0, 10) + '...' : value;
                }
            }, 
            axisTick: { alignWithLabel: true },
            axisLine: {
                lineStyle: {
                    color: '#333' // X轴线颜色
                }
            }
        },
        yAxis: { 
            name: "成就数量", 
            type: "value",
            nameTextStyle: { 
                fontSize: 14 // 增加Y轴名称字体大小
            },
            axisLabel: {
                fontSize: 12 // 增加Y轴标签字体大小
            },
            axisLine: {
                lineStyle: {
                    color: '#333' // Y轴线颜色
                }
            },
            splitLine: {
                lineStyle: {
                    type: 'dashed' // 分割线样式
                }
            }
        },
        dataZoom: [
            {
                type: 'slider', // 滑块缩放
                show: true,
                start: 0,
                end: (initialDisplayCount / sortedGames.length) * 100, // 初始显示比例
                handleSize: '100%', // 增加滑块手柄大小
                height: 20, // 增加滑块高度
                bottom: 10,
                backgroundColor: '#f0f0f0',
                fillerColor: '#6A5ACD',
                borderColor: '#ddd'
            },
            {
                type: 'inside', // 鼠标滚轮缩放
                start: 0,
                end: (initialDisplayCount / sortedGames.length) * 100
            }
        ],
        animationDuration: 1500,
        animationEasing: 'cubicOut',
        series: [{
            type: "bar",
            data: achievements,
            itemStyle: {
                color: '#FF6347' // 番茄红色
            },
            barWidth: "60%", // 调整柱状宽度以适应更大的图表
            label: {
                show: true,
                position: 'top',
                fontSize: 12 // 调整柱状图上方标签字体大小
            }
        }]
    };

    barChart.setOption(option);

    // 添加点击事件监听器
    barChart.on('click', function (params) {
        if (params.componentType === 'series') {
            const index = params.dataIndex;
            const game = sortedGames[index];
            if (game && game.name) {
                // 使用 encodeURIComponent 处理特殊字符
                const encodedTitle = encodeURIComponent(game.name);
                window.location.href = `game_details.html?title=${encodedTitle}`;
            }
        }
    });
}

// 新增：显示游戏排名
function generateGameRanking(games) {
    const rankingList = document.getElementById('rankingList'); // 获取DOM容器

    // const gameNames = games.map(game => game.name); // 使用从filtered_games.json加载的数据中的游戏名

  // 从游戏数据中提取游戏名和好评数
  const rankingData = games.map(game => ({
    name: game.name, // 游戏名称
    positiveReviews: game.PositiveReviews, // 好评数
    discount: (Math.random() * 50 + 10).toFixed(2) // 随机生成折扣价，范围10.00 - 60.00
}));

// 根据好评数进行排序，按降序排列
rankingData.sort((a, b) => b.positiveReviews - a.positiveReviews);

    // 渲染前4个排名项
    rankingList.innerHTML = ''; // 清空现有内容
    for (let i = 0; i < 4 && i < rankingData.length; i++) {
        const item = rankingData[i];
        const div = document.createElement('div');
        div.className = 'ranking-item';
        // div.innerHTML = `
        //     <span class="game-rank">#${item.rank}</span>
        //     <span class="game-name">${item.name}</span>
        //     <span class="discount-price">￥${item.discount}</span>
        // `;
        div.innerHTML = `
        <span class="game-rank">#${i + 1}</span> <!-- 修复：使用正确的排名 -->
        <span class="game-name">${item.name}</span> <!-- 游戏名称 -->
        <span class="discount-price">￥${item.discount}</span> <!-- 随机折扣价 -->
    `;
   // 为每个游戏项添加点击事件，跳转到游戏详情页面
   div.addEventListener('click', () => {
    window.location.href = `game_details.html?title=${encodeURIComponent(item.name)}`;
    console.log(item.details.Title);
});
    


        rankingList.appendChild(div);
    }

    // 启动自动滚动
    startAutoScroll(rankingData, 4, 3000); // 每3秒滚动一次
}
