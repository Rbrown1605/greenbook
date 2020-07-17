import { useState, useEffect } from "react";
import Link from "next/link";
import Head from "next/head";
import { getListings, getContent } from "../utils/getListings";
import Map from "../components/Map";
import list from "../css/list.module.css";
import Icons from "../components/Icons.js";
import home_styles from '../css/home.module.css';
import Menu from "../components/Menu";
import Footer from "../components/Footer";
import { useRouter } from "next/router";

const fuzzySearch = (string, srch) => {
    //console.log('srch', srch)
    let regy = srch
                .trim()
                .split(/\s+/)
                .map(function (c) {
                    return c.split(" ").join("\\W*");
                })
                .join("|");
    //console.log(regy);
	return (string || "").match(
		RegExp(
			regy,
			"gi"
		)
	);
};

// credit to https://www.geodatasource.com/developers/javascript
function getDistance(lat1, lon1, lat2, lon2, unit) {
    if ((lat1 == lat2) && (lon1 == lon2)) {
        return 0;
    }
    else {
        var radlat1 = Math.PI * lat1/180;
        var radlat2 = Math.PI * lat2/180;
        var theta = lon1-lon2;
        var radtheta = Math.PI * theta/180;
        var dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
        if (dist > 1) {
            dist = 1;
        }
        dist = Math.acos(dist);
        dist = dist * 180/Math.PI;
        dist = dist * 60 * 1.1515;
        if (unit=="K") { dist = dist * 1.609344 }
        if (unit=="N") { dist = dist * 0.8684 }
        return dist;
    }
}


export default (props) => {
    const router = useRouter();
	let { listings, cuisines, content } = props;

    //console.log('list', listings)
	let qs = {};
	let get_width = 1000;
	if (typeof window !== "undefined") {
		get_width = window.innerWidth;
		let params = (window.location.search || "")
			.substr(1)
			.split("&")
			.forEach((pair) => {
				var spl = pair.split("=");
				if (spl[0] && spl[1]) {
					qs[decodeURIComponent(spl[0])] = decodeURIComponent(spl[1]);
				}
			});
	}
	const filter = (row) => {
		var go = true;
		if (search) {
			if (!fuzzySearch(row._search, search)) {
				go = false;
			}
		}
        if (geoLocation) {
            let _distance = getDistance(row.geocoordinates.lat, row.geocoordinates.lng, geoLocation[0], geoLocation[1], 'M');
            if (_distance) {
                row.distance = _distance;
            } else {
                row.distance = 100; // not nearby??
            }
            //console.log('row', row.geocoordinates, 'vs', geoLocation, 'distance', row.distance)
            if (row.distance > 30) {
                go = false;
            }
        }
		return go;
	};
    const sortDistance = (a, b) => {
        if (a.distance < b.distance) {
            return -1;
        }
        if (a.distance > b.distance) {
            return 1;
        }
        return 0;
    }

	const [location, setLocation] = useState(qs.near || '');
    const [query, setQuery] = useState(qs.q || '');
    const [geoLocation, setGeoLocation] = useState();
    const [gettingGeo, setGettingGeo] = useState(true);
    const [pushInterval, setPushInterval] = useState(1);

    const fixSearch = (words) => {
        return (words || '').replace(/\+/, ' ').replace(/[^a-z0-9 ]/gi, '');
    }
    const [search, setSearch] = useState(fixSearch(query.q));

	const [width, setWidth] = useState(get_width);
	const [filteredList, setFilteredList] = useState(
		listings.filter(filter).sort(sortDistance)
	);

    let timer;
    useEffect(
        () => {
            setSearch(fixSearch(query.q));
            if (location) {
                fetch('/api/geocode?query=' + location).then(res => res.json()).then(json => {
                    if (json.coords) {
                        setGeoLocation(json.coords);
                    }
                    setGettingGeo(false);
                }).catch(console.error)
            } else {
                setGettingGeo(false);
                setFilteredList(listings.filter(filter));
            }
        },
        [ pushInterval ]
    );
    useEffect(
        () => {
            setFilteredList(listings.filter(filter).sort(sortDistance));
        },
        [ geoLocation ]
    );

    if (typeof window !== 'undefined') {
	    useEffect(
	        () => {
			    function handleResize() {
			      setWidth(window.innerWidth)
			    }
			    window.addEventListener('resize', handleResize);
			    return () => window.removeEventListener('resize', handleResize);
  	        },
	        [ ]
	    );
	}

	return (
		<div>
			<Head>
                <title>Search Our List - Spicy Green Book</title>
                <meta property="og:title" content="Search Our List - Spicy Green Book" key="title" />
                <meta property="og:url" content={"https://spicygreenbook.com/search"} key="og:url" />
			</Head>
            <header>
                <Menu mode="content" />
            </header>
            <div id="page">
                <div>
    			{width > 900 && 
    	            <div className={list.layoutMap}>
                        {!gettingGeo && 
    					   <Map list={filteredList} mode="d" near={geoLocation} />
                        }
    				</div>
    			}
                </div>
    			<div className={list.layoutList} style={{backgroundColor: '#fff'}}>
    				<div>
    	                <Link href="/"><a className="buttonBack" style={{whiteSpace: 'nowrap', marginBottom: 40}}>
    	                    <Icons type="left" color="#B56230" style={{display: 'inline-block', width: 16, height: 16, verticalAlign: 'middle', marginRight: 20}} />
    	                    <span style={{display: 'inline-block', verticalAlign: 'middle'}}>
    	                        Back To Home
    	                    </span>
    	                </a></Link>
    	            </div>
                    <div className={home_styles.searchBox} style={{textAlign: 'left', position: 'relative', zIndex: 2, padding: '20px 0'}}>
                        <form method="GET" action="/search" 
                            onSubmit={(e) => {
                                e.preventDefault();
                                let push = {}
                                if (location) {
                                    push.near = location;
                                }
                                if (query) {
                                    push.q = query;
                                }
                                setPushInterval(pushInterval + 1);
                                router.push({
                                    pathname: "/search",
                                    query: push,
                                });
                            }}
                        >
                            <div className={home_styles.searchBoxItem}>
                                <label>
                                    <div>Search</div>
                                    <div style={{marginTop:17}}>
                                        <input className={home_styles.select} name="q" value={query} placeholder="Tacos, BBQ, cheesecake"  onChange={(e) => setQuery(e.target.value)} list="cuisines" />
                                        <datalist id="cuisines">
                                            {cuisines.map(cuisine => (
                                                <option key={cuisine} value={cuisine}>{cuisine}</option>
                                            ))}
                                        </datalist>
                                    </div>
                                </label>
                            </div>
                            <div className={home_styles.searchBoxItem}>
                                <label>
                                    <div>Near Location</div>
                                    <div style={{marginTop:17}}>
                                        <input className={home_styles.select} name="near" value={location} placeholder="Bellflower, CA"  onChange={(e) => setLocation(e.target.value)}/>
                                    </div>
                                </label>
                            </div>
                            <div className={home_styles.searchBoxItem}>
                                <label>
                                    <div>{'\u00A0'}</div>
                                    <div style={{marginTop:17}}>
                                        <input type="submit" value="Search" />
                                    </div>
                                </label>
                            </div>
                        </form>
                    </div>

    				<h3>{query ? query : 'All Businesses'} ({filteredList && filteredList.length})</h3>

    				{width <= 900 && !gettingGeo && <Map list={filteredList} mode="m" near={geoLocation} />}

    				<div className={list.overallContainer}>
    					<div className={list.boxContainer}>
    						{filteredList && filteredList.length ? (
    							<React.Fragment>
    								{filteredList.map((row, i) => (
    									<Link
    										href={"/biz/" + row._slug}
    										key={"item" + i}
    									>
                                            <a>
        										<div
        											className={list.box}
        											style={{ cursor: "pointer" }}
        										>
        											<div
        												className={list.boxImage}
        												style={{
        													backgroundImage:
        														"url(" +
        														row.primary_image.url +
        														"&w=400)",
        												}}
        											/>
        											<div className={list.boxContent}>
        												<h3 className={list.boxTitle}>
        													{row.name}
        												</h3>
        												<p className={list.description}>{row.description}</p>
        	                                            <Icons type="tag" color="#CF9052" style={{width: 14, height: 14, marginRight: 6}} />
        	                                            {row.cuisines.map((line, i , ar) => (
        	                                            	<span key={line} style={{color: '#CF9052',display: 'inline-block', 'verticalAlign': 'middle'}}>
        	                                                	<span>{line}</span>
        	                                                	{ar[i+1] && (<span>,{'\u00A0'}</span>)}
        	                                                </span>
        	                                            ))}
        												<div
        													className={
        														list.boxContentRight
        													}
        												>
                                                            {row.distance && 
                                                                (<p>Distance: {(Math.round(row.distance * 10)/10)} Miles</p>)
                                                            }
        													{row.phone_number && (
        														<p>
        															{row.phone_number}
        														</p>
        													)}
        													{row.address && (
        														<p>
        															{row.address}
        														</p>
        													)}

        												</div>
        											</div>
        										</div>
                                            </a>
    									</Link>
    								))}
    							</React.Fragment>
    						) : (
    							<span>Sorry, nothing matches your search</span>
    						)}
    					</div>
    				</div>
    			</div>
                <Footer />
            </div>
		</div>
	);
};

export async function getStaticProps(context) {
	let data = await getListings({});

    data.listings.forEach(row => {
    	row._search = JSON.stringify(row)
    })

	return {
		props: { listings: data.listings, cuisines: data.cuisines },
	};
}
