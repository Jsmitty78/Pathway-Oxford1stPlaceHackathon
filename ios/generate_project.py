#!/usr/bin/env python3
"""Generate a dependency-free Xcode app project; rerun after adding a model or Swift file."""
from pathlib import Path
import hashlib
import json
import plistlib

root = Path(__file__).resolve().parent
objects = {}
def ident(name):
    return hashlib.sha1(name.encode()).hexdigest()[:24].upper()
def obj(key_name, **fields):
    key = ident(key_name)
    objects[key] = fields
    return key
files = sorted((root / 'PathwayApp').glob('*.swift')) + sorted((root / 'Sources/PathwayCore').glob('*.swift'))
refs, builds = [], []
for file in files:
    rel = file.relative_to(root).as_posix()
    ref = obj(rel, isa='PBXFileReference', lastKnownFileType='sourcecode.swift', path=rel, sourceTree='<group>')
    refs.append(ref)
    builds.append(obj('build:'+rel, isa='PBXBuildFile', fileRef=ref))
models = []
for file in sorted((root / 'PathwayApp').glob('*.mlpackage')):
    rel = file.relative_to(root).as_posix()
    ref = obj(rel, isa='PBXFileReference', lastKnownFileType='folder.mlpackage', path=rel, sourceTree='<group>')
    refs.append(ref)
    builds.append(obj('build:'+rel, isa='PBXBuildFile', fileRef=ref))
product = obj('product', isa='PBXFileReference', explicitFileType='wrapper.application', path='Pathway.app', sourceTree='BUILT_PRODUCTS_DIR')
products = obj('products', isa='PBXGroup', children=[product], name='Products', sourceTree='<group>')
group = obj('main', isa='PBXGroup', children=refs+[products], sourceTree='<group>')
sources = obj('sources', isa='PBXSourcesBuildPhase', buildActionMask=2147483647, files=builds, runOnlyForDeploymentPostprocessing=0)
frameworks = obj('frameworks', isa='PBXFrameworksBuildPhase', buildActionMask=2147483647, files=[], runOnlyForDeploymentPostprocessing=0)
resources = obj('resources', isa='PBXResourcesBuildPhase', buildActionMask=2147483647, files=[], runOnlyForDeploymentPostprocessing=0)
app_configs, project_configs = [], []
for name in ('Debug', 'Release'):
    settings = dict(PRODUCT_BUNDLE_IDENTIFIER='com.jakesmith.pathway.prototype', PRODUCT_NAME='$(TARGET_NAME)',
                    INFOPLIST_FILE='PathwayApp/Info.plist', SWIFT_VERSION='5.0', IPHONEOS_DEPLOYMENT_TARGET='17.0',
                    TARGETED_DEVICE_FAMILY='1', SDKROOT='iphoneos', SUPPORTED_PLATFORMS='iphoneos iphonesimulator',
                    CODE_SIGN_STYLE='Automatic', MARKETING_VERSION='0.1.0', CURRENT_PROJECT_VERSION='1',
                    SWIFT_EMIT_LOC_STRINGS='YES', GENERATE_INFOPLIST_FILE='NO',
                    LD_RUNPATH_SEARCH_PATHS=['$(inherited)', '@executable_path/Frameworks'])
    if name == 'Debug': settings.update(SWIFT_OPTIMIZATION_LEVEL='-Onone', SWIFT_ACTIVE_COMPILATION_CONDITIONS='DEBUG')
    else: settings.update(SWIFT_OPTIMIZATION_LEVEL='-O', SWIFT_COMPILATION_MODE='wholemodule')
    app_configs.append(obj('app:'+name, isa='XCBuildConfiguration', name=name, buildSettings=settings))
    project_configs.append(obj('project:'+name, isa='XCBuildConfiguration', name=name, buildSettings={'CLANG_ENABLE_MODULES':'YES', 'SWIFT_VERSION':'5.0'}))
app_list = obj('app-config', isa='XCConfigurationList', buildConfigurations=app_configs, defaultConfigurationIsVisible=0, defaultConfigurationName='Release')
project_list = obj('project-config', isa='XCConfigurationList', buildConfigurations=project_configs, defaultConfigurationIsVisible=0, defaultConfigurationName='Release')
target = obj('target', isa='PBXNativeTarget', buildConfigurationList=app_list, buildPhases=[sources,frameworks,resources], buildRules=[], dependencies=[], name='Pathway', productName='Pathway', productReference=product, productType='com.apple.product-type.application')
project = obj('project', isa='PBXProject', attributes={'LastUpgradeCheck':'1600'}, buildConfigurationList=project_list, compatibilityVersion='Xcode 14.0', developmentRegion='en', hasScannedForEncodings=0, knownRegions=['en','Base'], mainGroup=group, productRefGroup=products, projectDirPath='', projectRoot='', targets=[target])
def render(value):
    if isinstance(value, dict): return '{\n' + '\n'.join(f'{json.dumps(str(k))} = {render(v)};' for k,v in value.items()) + '\n}'
    if isinstance(value, list): return '(' + ', '.join(render(v) for v in value) + ')'
    if isinstance(value, int): return str(value)
    return json.dumps(value)
project_dir = root / 'Pathway.xcodeproj'
project_dir.mkdir(exist_ok=True)
(project_dir / 'project.pbxproj').write_text('// !$*UTF8*$!\n' + render({'archiveVersion':1,'classes':{},'objectVersion':56,'objects':objects,'rootObject':project})+'\n')
scheme_dir = project_dir / 'xcshareddata/xcschemes'
scheme_dir.mkdir(parents=True,exist_ok=True)
reference = f'<BuildableReference BuildableIdentifier="primary" BlueprintIdentifier="{target}" BuildableName="Pathway.app" BlueprintName="Pathway" ReferencedContainer="container:Pathway.xcodeproj"/>'
(scheme_dir / 'Pathway.xcscheme').write_text(f'''<?xml version="1.0" encoding="UTF-8"?>
<Scheme LastUpgradeVersion="1600" version="1.3">
<BuildAction parallelizeBuildables="YES" buildImplicitDependencies="YES"><BuildActionEntries><BuildActionEntry buildForTesting="YES" buildForRunning="YES" buildForProfiling="YES" buildForArchiving="YES" buildForAnalyzing="YES">{reference}</BuildActionEntry></BuildActionEntries></BuildAction>
<TestAction buildConfiguration="Debug" selectedDebuggerIdentifier="Xcode.DebuggerFoundation.Debugger.LLDB" selectedLauncherIdentifier="Xcode.IDEFoundation.Launcher.LLDB" shouldUseLaunchSchemeArgsEnv="YES"><Testables/></TestAction>
<LaunchAction buildConfiguration="Debug" selectedDebuggerIdentifier="Xcode.DebuggerFoundation.Debugger.LLDB" selectedLauncherIdentifier="Xcode.IDEFoundation.Launcher.LLDB" launchStyle="0" useCustomWorkingDirectory="NO" ignoresPersistentStateOnLaunch="NO" debugDocumentVersioning="YES" debugServiceExtension="internal" allowLocationSimulation="YES"><BuildableProductRunnable runnableDebuggingMode="0">{reference}</BuildableProductRunnable></LaunchAction>
<ProfileAction buildConfiguration="Release" shouldUseLaunchSchemeArgsEnv="YES" savedToolIdentifier="" useCustomWorkingDirectory="NO" debugDocumentVersioning="YES"><BuildableProductRunnable runnableDebuggingMode="0">{reference}</BuildableProductRunnable></ProfileAction>
<AnalyzeAction buildConfiguration="Debug"/><ArchiveAction buildConfiguration="Release" revealArchiveInOrganizer="YES"/>
</Scheme>
''')
print(f'Generated project with {len(builds)} source/model build entries.')
