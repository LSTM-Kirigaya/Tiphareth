import { Client } from '@elastic/elasticsearch';

// 创建 Elasticsearch 客户端
const client = new Client({
    node: 'https://localhost:9200', // ES 地址
    auth: {
        username: 'elastic',
        password: process.env['ES_PASSWORD'] || '', 
    },
    tls: {
        rejectUnauthorized: false,
    }
});

// 示例：创建一个索引
export async function createIndex(indexName: string) {
    try {
        const response = await client.indices.create({
            index: indexName,
        });
        // console.log('Index created:', response);
    } catch (error) {
        console.error('Error creating index:', error);
    }
}

// 示例：插入文档
export async function indexDocument(indexName: string, document: any) {
    try {
        const response = await client.index({
            index: indexName,
            body: document,
        });
        // console.log('Document indexed:', response);
    } catch (error) {
        console.error('Error indexing document:', error);
    }
}

// 示例：搜索文档
export async function searchDocuments(indexName: string, query: never) {
    try {
        const response = await client.search({
            index: indexName,
            body: {
                query: query
            },
        });
        // console.log('Search results:', response.hits.hits);
    } catch (error) {
        console.error('Error searching documents:', error);
    }
}

// 示例：删除索引
export async function deleteIndex(indexName: string) {
    try {
        const response = await client.indices.delete({
            index: indexName,
        });
        console.log('Index deleted:', response);
    } catch (error) {
        console.error('Error deleting index:', error);
    }
}