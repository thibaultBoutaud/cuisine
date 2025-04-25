CREATE TABLE users (
    _id VARCHAR(36) PRIMARY KEY,     
    _index INT AUTO_INCREMENT UNIQUE,       
    name VARCHAR(100) NOT NULL,
    email VARCHAR(50) UNIQUE,        
    password VARCHAR(100) NOT NULL,
    _isAdmin BOOLEAN DEFAULT FALSE, 
    isconnected BOOLEAN DEFAULT FALSE,
    img_url VARCHAR(200),
    INDEX idx_users_index (_index)  
)ENGINE=InnoDB;

ALTER TABLE users ADD COLUMN isconnected BOOLEAN DEFAULT FALSE; 

ALTER TABLE users ADD COLUMN date_inscription DATETIME DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE users ADD COLUMN description TEXT;