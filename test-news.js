import { getNewsFromHackNews } from './dist/services/news.js';

async function main() {
    console.log('开始生成科技新闻图片...');
    try {
        const imagePath = await getNewsFromHackNews();
        if (imagePath) {
            console.log('图片生成成功:', imagePath);
            return imagePath;
        } else {
            console.error('图片生成失败');
            return null;
        }
    } catch (error) {
        console.error('生成过程中出错:', error);
        return null;
    }
}

main().then(path => {
    if (path) {
        console.log('最终图片路径:', path);
    }
    process.exit(path ? 0 : 1);
});