resource "aws_db_instance" "order_db" {
  identifier            = "order-service-db"
  engine                = "postgres"
  engine_version        = "15.2"
  instance_class        = "db.t3.micro"
  allocated_storage     = 20
  storage_type          = "gp2"
  db_name               = "order_service"
  username              = "admin"
  password              = "securepassword"
  publicly_accessible   = false
}
