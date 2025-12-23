FROM nginx:alpine

# 移除默认配置
RUN rm /etc/nginx/conf.d/default.conf

# 复制自定义配置
COPY nginx.conf /etc/nginx/nginx.conf
COPY sites-enabled/ /etc/nginx/sites-enabled/

# 创建 SSL 证书目录
RUN mkdir -p /etc/nginx/ssl

# 暴露端口
EXPOSE 80 443

# 启动 Nginx
CMD ["nginx", "-g", "daemon off;"]