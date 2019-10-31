#!/bin/bash
#
#
DIR=$(dirname $0)

DBFILE=main.db
SQLFILE=tables.sql

DB=$DIR/$DBFILE
if [ -e $DB ]; then \
    echo 'DB has been already exist.' 1>&2
    exit -1
fi

if [ -z "$SQLITE" ]; then \
    if [ -n "$DB_KEY" ]; then \
	SQLITE=$(which sqlcipher);
	if [ -z "$SQLITE" ]; then \
	   SQLITE=sqlite3;
	   DB_KEY="";
	fi
    else
	SQLITE=sqlite3;
    fi
fi

SQL=""
if [ -n "$DB_KEY" ]; then \
    SQL+="pragma key='${DB_KEY}';"
fi
SQL+=$(cat $DIR/$SQLFILE)

echo "$SQL"|$SQLITE $DB

echo done
