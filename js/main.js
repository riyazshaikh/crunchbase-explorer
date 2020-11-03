window.addEventListener('DOMContentLoaded', () => {
    'use strict';
    const COLORS = ["#f7fbff","#f6faff","#f5fafe","#f5f9fe","#f4f9fe","#f3f8fe","#f2f8fd","#f2f7fd","#f1f7fd","#f0f6fd","#eff6fc","#eef5fc","#eef5fc","#edf4fc","#ecf4fb","#ebf3fb","#eaf3fb","#eaf2fb","#e9f2fa","#e8f1fa","#e7f1fa","#e7f0fa","#e6f0f9","#e5eff9","#e4eff9","#e3eef9","#e3eef8","#e2edf8","#e1edf8","#e0ecf8","#e0ecf7","#dfebf7","#deebf7","#ddeaf7","#ddeaf6","#dce9f6","#dbe9f6","#dae8f6","#d9e8f5","#d9e7f5","#d8e7f5","#d7e6f5","#d6e6f4","#d6e5f4","#d5e5f4","#d4e4f4","#d3e4f3","#d2e3f3","#d2e3f3","#d1e2f3","#d0e2f2","#cfe1f2","#cee1f2","#cde0f1","#cce0f1","#ccdff1","#cbdff1","#cadef0","#c9def0","#c8ddf0","#c7ddef","#c6dcef","#c5dcef","#c4dbee","#c3dbee","#c2daee","#c1daed","#c0d9ed","#bfd9ec","#bed8ec","#bdd8ec","#bcd7eb","#bbd7eb","#b9d6eb","#b8d5ea","#b7d5ea","#b6d4e9","#b5d4e9","#b4d3e9","#b2d3e8","#b1d2e8","#b0d1e7","#afd1e7","#add0e7","#acd0e6","#abcfe6","#a9cfe5","#a8cee5","#a7cde5","#a5cde4","#a4cce4","#a3cbe3","#a1cbe3","#a0cae3","#9ec9e2","#9dc9e2","#9cc8e1","#9ac7e1","#99c6e1","#97c6e0","#96c5e0","#94c4df","#93c3df","#91c3df","#90c2de","#8ec1de","#8dc0de","#8bc0dd","#8abfdd","#88bedc","#87bddc","#85bcdc","#84bbdb","#82bbdb","#81badb","#7fb9da","#7eb8da","#7cb7d9","#7bb6d9","#79b5d9","#78b5d8","#76b4d8","#75b3d7","#73b2d7","#72b1d7","#70b0d6","#6fafd6","#6daed5","#6caed5","#6badd5","#69acd4","#68abd4","#66aad3","#65a9d3","#63a8d2","#62a7d2","#61a7d1","#5fa6d1","#5ea5d0","#5da4d0","#5ba3d0","#5aa2cf","#59a1cf","#57a0ce","#569fce","#559ecd","#549ecd","#529dcc","#519ccc","#509bcb","#4f9acb","#4d99ca","#4c98ca","#4b97c9","#4a96c9","#4895c8","#4794c8","#4693c7","#4592c7","#4492c6","#4391c6","#4190c5","#408fc4","#3f8ec4","#3e8dc3","#3d8cc3","#3c8bc2","#3b8ac2","#3a89c1","#3988c1","#3787c0","#3686c0","#3585bf","#3484bf","#3383be","#3282bd","#3181bd","#3080bc","#2f7fbc","#2e7ebb","#2d7dbb","#2c7cba","#2b7bb9","#2a7ab9","#2979b8","#2878b8","#2777b7","#2676b6","#2574b6","#2473b5","#2372b4","#2371b4","#2270b3","#216fb3","#206eb2","#1f6db1","#1e6cb0","#1d6bb0","#1c6aaf","#1c69ae","#1b68ae","#1a67ad","#1966ac","#1865ab","#1864aa","#1763aa","#1662a9","#1561a8","#1560a7","#145fa6","#135ea5","#135da4","#125ca4","#115ba3","#115aa2","#1059a1","#1058a0","#0f579f","#0e569e","#0e559d","#0e549c","#0d539a","#0d5299","#0c5198","#0c5097","#0b4f96","#0b4e95","#0b4d93","#0b4c92","#0a4b91","#0a4a90","#0a498e","#0a488d","#09478c","#09468a","#094589","#094487","#094386","#094285","#094183","#084082","#083e80","#083d7f","#083c7d","#083b7c","#083a7a","#083979","#083877","#083776","#083674","#083573","#083471","#083370","#08326e","#08316d","#08306b"];
    const MILLION = Math.pow(10, 6);
    const usChart = new dc.GeoChoroplethChart("#us-chart");
    const industryChart = new dc.BubbleChart("#industry-chart");
    const companyTable = new dc.DataTable("#company-table .dc-data-table");

    d3.csv("data/crunchbase-companies.csv").then(csv => {
        const data = crossfilter(csv);
    
        const states = data.dimension(d => d.state_code);
        const stateRaisedSum = states.group().reduceSum(d => (+d.funding_total_usd || 0) / MILLION);
        const names = data.dimension(d => d.name);
        const industries = data.dimension(d => d.category_code);
        const statsByIndustries = industries.group().reduce(
                (p, v) => {
                    const fundInMill = (+v.funding_total_usd || 0) / MILLION;
                    p.amountRaised += fundInMill;
                    p.companies += 1;
                    p.fundings.push(fundInMill);
                    return p;
                },
                (p, v) => {
                    const fundInMill = (+v.funding_total_usd || 0) / MILLION;
                    p.amountRaised -= fundInMill;
                    if (p.amountRaised < 0.001) p.amountRaised = 0;
                    p.companies -= 1;
                    p.fundings.splice(p.fundings.findIndex(val => val === fundInMill),1);
                    return p;
                },
                () => ({amountRaised: 0, companies: 0, fundings: [] })
        );
    
        const statsDomain = statsByIndustries.all().reduce((accum, p) => accum.concat(p.value.fundings), []);
        const stateRaisedDomain = stateRaisedSum.all().reduce((accum,p) => accum.concat(p.value), []);
        const allCompanyCounts = statsByIndustries.all().map(p => p.value.companies);
        const allAmountCounts = statsByIndustries.all().map(p => p.value.amountRaised);

        d3.json("data/us-states.json").then(statesJson => {
            usChart.width(1100)
                    .height(500)
                    .dimension(states)
                    .group(stateRaisedSum)
                    .colors(d3.scaleQuantile().range(COLORS))
                    .colorDomain(stateRaisedDomain)
                    .colorCalculator(d => usChart.colors()(d))
                    .overlayGeoJson(statesJson.features, "state", d => d.properties.name)
                .projection(d3.geoAlbersUsa())
                .valueAccessor(kv => kv.value)
                    .title(d => `State: ${d.key}\nTotal Amount Raised: ${numberFormat(d.value ? d.value : 0, MILLION)}`);
    
            industryChart.width(1100)
                    .height(500)
                    .margins({top: 10, right: 50, bottom: 30, left: 60})
                    .dimension(industries)
                    .group(statsByIndustries)
                    .keyAccessor(p => p.value.amountRaised)
                    .valueAccessor(p => p.value.companies)
                    .radiusValueAccessor(p => d3.median(p.value.fundings))
                    .y(d3.scaleLinear().domain(allCompanyCounts))
                    .x(d3.scaleLinear().domain(allAmountCounts))
                    .r(d3.scaleQuantile().domain(statsDomain).range(d3.range(2,5)))
                    .elasticY(true)
                    .elasticX(true)
                    .yAxisPadding("10%")
                    .xAxisPadding("10%")
                    .minRadiusWithLabel(1)
                    .maxBubbleRelativeSize(0.04)
                    .renderHorizontalGridLines(true)
                    .renderVerticalGridLines(true)
                    .renderLabel(true)
                    .renderTitle(true)
                    .title(p => {
                        return `${p.key}\nTotal Funding: ${numberFormat(p.value.amountRaised, MILLION)}\nMedian Funding: ${numberFormat(d3.median(p.value.fundings), MILLION)}\nNumber of Companies: ${numberFormat(p.value.companies)}`;
                    })
                    .on('renderlet', chart => {
                        chart.svg().select(".chart-body").attr("clip-path",null);
                    });
            
            industryChart.xAxis().tickFormat(s => `$${numberFormat(s, MILLION)}`);
            industryChart.yAxis().tickFormat(s => s);
    
            companyTable
                    .dimension(names)
                    .section(d => d.category_code || 'No Category')
                    .size(100)
                    .columns([
                        {
                            label: 'Name',
                            format: d => `<a href="https://www.crunchbase.com${d.permalink}" target=_blank>${d.name}</a>`
                        },
                        {
                            label: 'Total Funding',
                            format: d => '$' + numberFormat(+d.funding_total_usd)
                        },
                        'status',
                        'region',
                        {
                            label: 'Founded',
                            format: d => d.founded_at
                        },
                        {
                            label: 'Last Milestone',
                            format: d => d.last_milestone_at
                        }
                    ])
                    .sortBy(d => d.founded_at)
                    .order(d3.ascending)
                    
            companyTable.on('renderlet', table => table.selectAll(".dc-table-group").classed("info", true));
    
            dc.renderAll();
        });

        const numberFormat = (val, base = 1) => new Intl.NumberFormat('en-US', { notation: 'compact' }).format(val * base);

        const reset = chart => {
            chart.filterAll();
            dc.redrawAll();
        }
        document.querySelector('#us-chart a.reset').addEventListener('click', () => reset(usChart));
        document.querySelector('#industry-chart a.reset').addEventListener('click', () => reset(industryChart));
        document.querySelector('#company-table a.reset').addEventListener('click', () => reset(companyTable));
    });
});