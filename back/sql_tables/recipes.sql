CREATE TABLE recipes(
    _id VARCHAR(40) PRIMARY KEY,
    _index INT AUTO_INCREMENT UNIQUE,
    user_id VARCHAR(40) ,
    name  VARCHAR(250) NOT NULL,
    img_url VARCHAR(200),
    category ENUM('entrée','plat','dessert','boisson','apéro','petit-dejeuner') NOT NULL,
    difficulty ENUM('facile','moyen','difficile') NOT NULL,
    author VARCHAR(40),
    authorImg_url VARCHAR(40),
    servings INT ,
    cook_time INT ,
    prep_time INT ,
    FOREIGN KEY (user_id) REFERENCES users (_id) ON DELETE CASCADE 
)ENGINE=InnoDB;


ALTER TABLE recipes ADD COLUMN authorImg_url VARCHAR(200);
