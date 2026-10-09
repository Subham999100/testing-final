#!/bin/bash
set -e

service postgresql start

# Set listen_addresses and authentication
PG_CONF=$(find /etc/postgresql -name postgresql.conf | head -n 1)
PG_HBA=$(find /etc/postgresql -name pg_hba.conf | head -n 1)

sed -i "s/#listen_addresses = 'localhost'/listen_addresses = '*'/g" "$PG_CONF"
# Also ensure port is 5432
sed -i "s/port = 5432/port = 5432/g" "$PG_CONF"

# Allow password auth for postgres user from localhost
if ! grep -q "host all all 127.0.0.1/32 md5" "$PG_HBA"; then
    echo "host all all 127.0.0.1/32 md5" >> "$PG_HBA"
    echo "host all all ::1/128 md5" >> "$PG_HBA"
    echo "host all all all md5" >> "$PG_HBA"
fi

service postgresql restart

# Set postgres password and create database
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'postgres';"
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname = 'clyptus_recruitment'" | grep -q 1 || sudo -u postgres psql -c "CREATE DATABASE clyptus_recruitment;"

echo "PostgreSQL setup complete!"
