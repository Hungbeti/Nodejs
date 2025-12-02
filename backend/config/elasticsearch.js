// config/elasticsearch.js
const { Client } = require('@elastic/elasticsearch');

const client = new Client({
  node: process.env.ELASTICSEARCH_HOST || 'http://localhost:9200'
});

const checkConnection = async () => {
  let isConnected = false;
  
  while (!isConnected) {
    try {
      console.log('⏳ Đang thử kết nối Elasticsearch...');
      await client.cluster.health({});
      console.log('✅ Elasticsearch đã kết nối thành công!');
      isConnected = true;
    } catch (error) {
      console.error('❌ Chưa kết nối được ES, thử lại sau 5s...');
      // Chờ 5 giây trước khi thử lại
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
};

// Gọi hàm check này, nhưng KHÔNG await nó để không chặn server khởi động
checkConnection();

module.exports = client;