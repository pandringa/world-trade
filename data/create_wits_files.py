import csv
import json

countries = {}
country_index = {}
count = 0
parseCount = 0

with open("wits.csv") as csvfile:
  for row in csv.DictReader(csvfile):
    count += 1
    code = row['ReporterISO3']
    partner = row['PartnerISO3']
    year = row['Year']
    flow = row['TradeFlowName'].lower()[1:2]
    
    if code not in country_index:
      country_index[code] = row['ReporterName'].decode('latin-1')
    if partner not in country_index:
      country_index[partner] = row['PartnerName'].decode('latin-1')
    if code not in countries:
      countries[code] = {}
    if year not in countries[code]:
      countries[code][year] = {}
    if partner not in countries[code][year]:
      countries[code][year][partner] = {}
    if flow in countries[code][year][partner]:
      print "DUPLICATE %s -> %s (%s %s)" % (code, partner, year, flow)
    countries[code][year][partner][flow] = float(row['TradeValue'])
    parseCount += 1

print "Parsed "+str(parseCount)+"/"+str(count)+" rows from CSV."

for country in countries:
  with open('countries/'+country+'.json', 'w') as jsonfile:
    json.dump(countries[country], jsonfile)

with open('countries/index.json', 'w') as jsonfile:
  json.dump(country_index, jsonfile)