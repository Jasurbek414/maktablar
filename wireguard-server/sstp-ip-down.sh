#!/bin/sh
# pppd ip-down (SSTP): sessiya tugadi — holat faylini olib tashlaydi. Marshrut interfeys bilan
# birga o'zi yo'qoladi; qayta ulangan yangi sessiyaning marshrutiga tegilmaydi.
[ -n "$1" ] && rm -f "/run/sstp-sessions/$1"
exit 0
