# Dogshed
## Server Setup
### Assumptions

+ A basic server has been setup and secured using Ubuntu 16+
+ The server has a publicly facing IP address
+ a sudo user with root access exists on the server
+ Firewall being used is UFW and no ports are open except SSH port
+ Nano text editor is being used (substitute your favorite)

### Process

####Get valid SSL Certificate

````
Install Letsencrypt (16.04 - 17.10)
    sudo apt-get install letsencrypt
    
Install Letsencrypt (16.04 - 17.10)
    sudo apt-get install certbot
````  

````
Drop the firewall
    sudo ufw disable
    
Generate SSL certificate
    sudo certbot certonly --standalone -d server.url
    
    Fill out the form that will appear on the screen
    
Raise the firewall
    sudo ufw enable
````

Now you have a valid SSL certificate in the folder:
    /etc/letsencrypt/live/server.url/
    
####Install Nginx reverse proxy server
````
    sudo apt-get install nginx
````
####Open HTTP and HTTPS ports
````    
    sudo ufw enable http
    sudo ufw enable https
````

####Create Nginx conf
````
    sudo nano /etc/nginx/sites-available/server.url.conf
````
    
####Paste the following conf template and save
````
server {
        listen 80;
        listen [::]:80;

        root /server/kadota/dogshed/public;

        index index.html;

        server_name server.url;

        location / {
                # let the dogshed handle it all
                proxy_pass http://127.0.0.1:3000;
                proxy_http_version 1.1;
                proxy_set_header Upgrade $http_upgrade;
                proxy_set_header Connection 'upgrade';
                proxy_set_header Host $host;
                proxy_cache_bypass $http_upgrade;
                #try_files $uri $uri/ =404;
        }

    listen 443 ssl; # managed by Certbot
ssl_certificate /etc/letsencrypt/live/server.url/fullchain.pem; # managed by Certbot
ssl_certificate_key /etc/letsencrypt/live/server.url/privkey.pem; # managed by Certbot
ssl_session_cache shared:le_nginx_SSL:1m; # managed by Certbot
ssl_session_timeout 1440m; # managed by Certbot

ssl_protocols TLSv1 TLSv1.1 TLSv1.2; # managed by Certbot
ssl_prefer_server_ciphers on; # managed by Certbot

ssl_ciphers "ECDHE-ECDSA-AES128-GCM-SHA256 ECDHE-ECDSA-AES256-GCM-SHA384 ECDHE-ECDSA-AES128-SHA ECDHE-ECDSA-AES256-SHA ECDHE-ECDSA-AES128-SHA256 ECDHE-ECDSA-AES256-SHA384 ECDHE-RSA-AES128-GCM-SHA256 ECDHE-RSA-AES256-GCM-SHA384 ECDHE-RSA-AES128-SHA ECDHE-RSA-AES128-SHA256$



    if ($scheme != "https") {
        return 301 https://$host$request_uri;
    } # managed by Certbot

}

````
####Symlink Sites-Enabled
````
    cd /etc/nginx/sites-enabled
    ln -s ../sites-available/server.url.conf
````    
####Install Node.js and Build-Essential
````
    curl -sL https://deb.nodesource.com/setup_10.x | sudo -E bash -
    sudo apt-get install nodejs
    sudo apt-get install build-essential   
````
####Install Git
````
    sudo apt-get install git
````

####Create Project user
The project user is created in order to use an account with no rights on the server
````
    adduser kadota --disabled-password
````
####Login to Project user
````
    sudo su
    su - kadota
````
####Create dogshed directory
````
    mkdir dogshed
````
####Clone Dogshed repository
````
    git clone https://cloud.reclaim.technology/git/djsundog/dogshed.git dogshed
````
####Install Dependencies
````
    cd dogshed
    npm install
````
####Setup .env variables
````
    nano .env.SAMPLE
    
        Edit the values in the file.
        Save file as .env
````
####Start Server
````
    node index.js
````
####Test Server
````
    Open web browser and go to https://server.url/admin 
````
