FROM php:8.3-fpm

# Install system dependencies & PHP extensions using php-extension-installer
COPY --from=mlocati/php-extension-installer /usr/bin/install-php-extensions /usr/local/bin/

RUN install-php-extensions \
    gd \
    zip \
    intl \
    bcmath \
    pdo_mysql \
    redis \
    opcache \
    exif

# Install Node.js & NPM (for building front-end assets)
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Remap www-data to uid/gid 1000 to match WSL's /mnt automount owner.
# Without this, php-fpm (uid 33) is never the "owner" of bind-mounted files on
# /mnt/d and touch()/utime() fails with EPERM (e.g. Blade compiled views).
RUN usermod -u 1000 www-data && groupmod -g 1000 www-data

# Set working directory
WORKDIR /var/www

# Expose port 9000
EXPOSE 9000

CMD ["php-fpm"]
