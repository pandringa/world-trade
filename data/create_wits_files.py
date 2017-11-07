import csv
import json

countries = {}
country_index = {}
count = 0
parseCount = 0

country_replace = {
  'CSK': 'CZE', # Czechoslovakia -> Czech Republic 
  'TMP': 'TLS', # Timor -> Timor Leste
  'DDR': 'DEU', # East Germany -> Germany
  'ANT': 'CUW', # Netherlands Antilles -> Curacao
  'SVU': 'RUS', # Soviet Union -> Russia
  'YUG': 'SER', # Yugoslavia -> Serbia
  'ZAR': 'COD', # Zaire -> Dem. Rep. Congo
}

with open("wits_full.csv") as csvfile:
  for row in csv.DictReader(csvfile):
    count += 1
    code = row['ReporterISO3']
    partner = row['PartnerISO3']
    year = row['Year']
    flow = row['TradeFlowName'].lower()[1:2]
    
    if code in country_replace: 
      code = country_replace[code]
    if partner in country_replace:
      partner = country_replace[partner]

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
      countries[code][year][partner][flow] += float(row['TradeValue'])
    countries[code][year][partner][flow] = float(row['TradeValue'])
    parseCount += 1

print "Parsed "+str(parseCount)+"/"+str(count)+" rows from CSV."

for country in countries:
  with open('countries/'+country+'.json', 'w') as jsonfile:
    json.dump(countries[country], jsonfile)

with open('countries/index.json', 'w') as jsonfile:
  json.dump(country_index, jsonfile)