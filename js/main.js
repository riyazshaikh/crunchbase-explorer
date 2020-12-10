window.addEventListener('DOMContentLoaded', async () => {
    'use strict';

    const MILLION = Math.pow(10, 6);
    const DATE_2000 = new Date(2000, 0, 1);
    const DATE_NOW = new Date();
    const WIDTH = document.querySelector('.container').offsetWidth - 50;

    // Initialize charts
    const dateChart = new dc.BarChart("#date-chart .chart");
    const stageChart = new dc.PieChart("#stage-chart .chart");
    const stateChart = new dc.RowChart("#state-chart .chart");
    const sectorChart = new dc.RowChart("#sector-chart .chart");
    const investorChart = new dc.RowChart("#investor-chart .chart");
    const companyTable = new dc.DataTable("#company-table .dc-data-table");

    // Define formatters
    const yearFormatter = new Intl.DateTimeFormat('en', { year: 'numeric' });
    const monthFormatter = new Intl.DateTimeFormat('en', { year: 'numeric', month: 'short' });
    const numFormatter = new Intl.NumberFormat('en-US', { notation: 'compact' });
    
    const keyFormat = key => key.replace(/[_\\-]/g,' ');
    const numberFormat = (val, base = 1) => numFormatter.format(val * base);

    // Setup reset handlers
    const charts = {
        '#date-chart': dateChart,
        '#stage-chart': stageChart,
        '#state-chart': stateChart,
        '#sector-chart': sectorChart,
        '#investor-chart': investorChart
    }
    Object.keys(charts).forEach(key => {
        document.querySelector(key + ' a.reset').addEventListener('click', () => {
            charts[key].filterAll();
            dc.redrawAll();            
        });
    })

    // Setup crossfilter dimensions
    const data = await d3.json("https://ventures-645.web.app/data/companies.json");
    const cf = crossfilter(data);
    const names = cf.dimension(d => d.name);
    const stages = cf.dimension(d => d.series[d.series.length-1] || 'Unknown');
    const states = cf.dimension(d => d.state || 'Unknown');
    const industries = cf.dimension(d => d.sectors.length ? d.sectors : ['Unknown'], true);
    const seeders = cf.dimension(d => d.seed_investor.map(keyFormat), true);
    const dates = cf.dimension(d => d.founded_date);

    // Setup founded date chart
    dateChart.width(WIDTH/5)
            .height(220)
            .margins({top: 20, right: 20, bottom: 20, left: 40})
            .dimension(dates)
            .group(dates.group())
            .brushOn(true)
            .x(d3.scaleTime().clamp(true).domain([DATE_2000, DATE_NOW]))
            .xUnits(d3.timeYears)
            .y(d3.scaleLinear().domain([0,2000]))
            .elasticY(true)
            .elasticX(true)
            .renderHorizontalGridLines(true)
    
    dateChart.yAxis().ticks(5)
    dateChart.xAxis().ticks(5)

    // Plot row charts
    stageChart
            .width(WIDTH/5)
            .height(220)
            .dimension(stages)
            .group(stages.group())
            .slicesCap(3)
            .innerRadius(10)

    stateChart
            .width(WIDTH/5)
            .height(states.group().all().length * 20)
            .margins({top: 20, right: 20, bottom: 20, left: 20})
            .dimension(states)
            .group(states.group())

    sectorChart
            .width(WIDTH/5)
            .height(industries.group().all().length * 20)
            .margins({top: 20, right: 20, bottom: 20, left: 20})
            .dimension(industries)
            .group(industries.group())

    investorChart
            .width(WIDTH/5)
            .height(seeders.group().all().length * 20)
            .margins({top: 20, right: 20, bottom: 20, left: 20})
            .dimension(seeders)
            .group(seeders.group())

    // Move x axis to the top and limit to 5 ticks
    Object.values(charts).forEach(chart => {
        if (!(chart instanceof dc.RowChart)) {
            return;
        }
        chart.xAxis(d3.axisTop())
            .on('pretransition', chart => {
                chart.select('g.axis').attr('transform', 'translate(0,0)');
                chart.selectAll('line.grid-line').attr('y2', chart.effectiveHeight());
            })
        chart.xAxis().ticks(5)
    })

    // Setup data table pagination
    const $begin = document.querySelector('#begin');
    const $end = document.querySelector('#end');
    const $size = document.querySelector('#size');
    const $prev = document.querySelector('#prev');
    const $next = document.querySelector('#next');

    let ofs = 0, pag = 25;
    const update_offset = () => {
        const totFilteredRecs = cf.groupAll().value();
        const end = ofs + pag > totFilteredRecs ? totFilteredRecs : ofs + pag;
        ofs = ofs >= totFilteredRecs ? Math.floor((totFilteredRecs - 1) / pag) * pag : ofs;
        ofs = ofs < 0 ? 0 : ofs;

        companyTable.beginSlice(ofs);
        companyTable.endSlice(ofs+pag);
    }
    const display = () => {
        const totFilteredRecs = cf.groupAll().value();
        const end = ofs + pag > totFilteredRecs ? totFilteredRecs : ofs + pag;
        $begin.textContent = end === 0? ofs : ofs + 1;
        $end.textContent = end;
        $size.textContent = totFilteredRecs;
        if (ofs-pag<0) {
            $prev.setAttribute('disabled', 'true');
        } else {
            $prev.removeAttribute('disabled');
        }
        if (ofs+pag>=totFilteredRecs) {
            $next.setAttribute('disabled', 'true');
        } else {
            $next.removeAttribute('disabled');
        }
    }
    $prev.addEventListener('click', () => {
        ofs -= pag;
        update_offset();
        companyTable.redraw();        
    })
    $next.addEventListener('click', () => {
        ofs += pag;
        update_offset();
        companyTable.redraw();        
    })

    // Setup data table display
    companyTable
            .dimension(names)
            .size(Infinity)
            .showSections(false)
            .columns([
                {
                    label: 'Name',
                    format: d => `<a href="https://www.crunchbase.com/organization/${d.permalink}" target=_blank>${d.name}</a>`
                },
                'headquarters',
                {
                    label: 'Sectors',
                    format: d => d.sectors.join(', ')
                },
                {
                    label: 'Investors',
                    format: d => {
                        let text = '';
                        if (d.seed_investor.length) {
                            text += '\nSeed: ' + d.seed_investor.map(keyFormat).join(', ');
                        }
                        if (d.venture_investor.length) {
                            text += '\nVenture: ' + d.venture_investor.map(keyFormat).join(', ');
                        }
                        return text;
                    }
                },
                {
                    label: 'Funding',
                    format: d => `$${numberFormat(d.total_funding_usd)}`
                },
                {
                    label: 'Announced',
                    format: d =>  d.announced_on.map(val => monthFormatter.format(val)).join(', ')
                },
                {
                    label: 'Rounds',
                    format: d => {
                        return d.series.join(', ')
                                    .replace('Convertible Note', 'Note')
                                    .replace('Angel / Seed', 'Seed')
                                    .replace('Venture Round', 'Venture');
                    }
                }
            ])
            .sortBy(d => d.total_funding_usd)
            .order(d3.descending)
            .on('preRender', update_offset)
            .on('preRedraw', update_offset)
            .on('pretransition', display)

    dc.renderAll();
    document.querySelector('body').classList.add('loaded');
});